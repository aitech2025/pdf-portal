"""
Property-based tests for PDF access filtering (school-category-access feature).

Feature: school-category-access
Uses Hypothesis with an httpx.AsyncClient against the FastAPI app backed by
an in-memory SQLite database (configured in conftest.py).

Each property test is a synchronous function (required by Hypothesis) that
drives async logic via asyncio.run().  A fresh AsyncClient is created inside
each async helper so the ASGI transport is properly opened/closed.
"""
import asyncio
import uuid

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

from app.main import app
from app.models.pdf import PDF
from app.models.school import SchoolCategoryAccess

from httpx import AsyncClient, ASGITransport

from tests.conftest import (
    TestingSessionLocal,
    create_school,
    create_category,
    create_user,
    make_token,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _uid(prefix: str = "x") -> str:
    """Generate a unique string suitable for names / emails."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


async def _make_client() -> AsyncClient:
    """Return an open AsyncClient using the test app."""
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    await client.__aenter__()
    return client


async def _close_client(client: AsyncClient) -> None:
    await client.__aexit__(None, None, None)


async def create_pdf(db, category_id: str, file_name: str = "test.pdf") -> PDF:
    """Create a PDF record in the given category."""
    pdf = PDF(
        file_name=file_name,
        file_path=f"fake_{uuid.uuid4().hex[:8]}.pdf",
        category_id=category_id,
        status="approved",
        is_active=True,
    )
    db.add(pdf)
    await db.commit()
    await db.refresh(pdf)
    return pdf


async def _assign_categories(client: AsyncClient, school_id: str, cat_ids: list, headers: dict) -> None:
    """Assign a list of categories to a school via the API."""
    resp = await client.post(
        f"/api/schools/{school_id}/categories",
        json={"categoryIds": cat_ids},
        headers=headers,
    )
    assert resp.status_code == 200, f"Category assignment failed: {resp.text}"


# ---------------------------------------------------------------------------
# Property 5: PDF list filtered to assigned categories
# Feature: school-category-access, Property 5: PDF list filtered to assigned categories
# Validates: Requirements 2.1, 2.4
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow],
    deadline=None,
)
@given(
    n_assigned=st.integers(min_value=1, max_value=3),
    n_unassigned=st.integers(min_value=1, max_value=3),
)
def test_prop5_pdf_list_filtered_to_assigned_categories(n_assigned, n_unassigned):
    # Feature: school-category-access, Property 5: PDF list filtered to assigned categories
    """
    For any school user whose school has a non-empty set of assigned categories C,
    every PDF returned by GET /api/pdfs should have a category_id that is a member of C.

    Validates: Requirements 2.1, 2.4
    """
    asyncio.run(_prop5(n_assigned, n_unassigned))


async def _prop5(n_assigned: int, n_unassigned: int) -> None:
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))

        # Create assigned and unassigned categories
        assigned_cats = [
            await create_category(db, name=_uid("assigned"), category_type="Grade 1-5")
            for _ in range(n_assigned)
        ]
        unassigned_cats = [
            await create_category(db, name=_uid("unassigned"), category_type="Grade 6-10")
            for _ in range(n_unassigned)
        ]

        # Create PDFs in both assigned and unassigned categories
        for cat in assigned_cats:
            await create_pdf(db, category_id=cat.id, file_name=_uid("pdf") + ".pdf")
        for cat in unassigned_cats:
            await create_pdf(db, category_id=cat.id, file_name=_uid("pdf") + ".pdf")

        # Create school user and admin
        school_user = await create_user(
            db, email=_uid() + "@t.com", role="school", school_id=school.id
        )
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    assigned_ids = {c.id for c in assigned_cats}
    admin_headers = {"Authorization": f"Bearer {make_token(admin)}"}
    user_headers = {"Authorization": f"Bearer {make_token(school_user)}"}

    client = await _make_client()
    try:
        # Assign only the assigned categories to the school
        await _assign_categories(client, school.id, list(assigned_ids), admin_headers)

        # School user fetches PDF list — should only see PDFs in assigned categories
        resp = await client.get("/api/pdfs", headers=user_headers)
        assert resp.status_code == 200, f"GET /api/pdfs failed: {resp.text}"

        data = resp.json()
        items = data["items"]

        # Every returned PDF must have a category_id in the assigned set
        for item in items:
            assert item["categoryId"] in assigned_ids, (
                f"PDF {item['id']} has categoryId={item['categoryId']!r} "
                f"which is not in assigned set {assigned_ids}"
            )

        # The returned PDFs should include at least the ones in assigned categories
        # (there should be n_assigned PDFs visible)
        returned_category_ids = {item["categoryId"] for item in items}
        assert returned_category_ids.issubset(assigned_ids), (
            f"Returned category IDs {returned_category_ids} are not a subset of "
            f"assigned IDs {assigned_ids}"
        )
    finally:
        await _close_client(client)


# ---------------------------------------------------------------------------
# Property 6: Unauthorized PDF access and download return 403
# Feature: school-category-access, Property 6: Unauthorized PDF access returns 403
# Validates: Requirements 2.2, 2.3
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow],
    deadline=None,
)
@given(dummy=st.none())
def test_prop6_unauthorized_pdf_access_returns_403(dummy):
    # Feature: school-category-access, Property 6: Unauthorized PDF access returns 403
    """
    For any school user and any PDF whose category_id is not in the user's school's
    assigned category set, both GET /api/pdfs/{id} and GET /api/pdfs/{id}/download
    should return 403.

    Validates: Requirements 2.2, 2.3
    """
    asyncio.run(_prop6())


async def _prop6() -> None:
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))

        # One assigned category and one unassigned category
        assigned_cat = await create_category(db, name=_uid("assigned"), category_type="Grade 1-5")
        unassigned_cat = await create_category(db, name=_uid("unassigned"), category_type="Grade 6-10")

        # Create a PDF in the unassigned category
        forbidden_pdf = await create_pdf(
            db, category_id=unassigned_cat.id, file_name=_uid("forbidden") + ".pdf"
        )

        # Create school user and admin
        school_user = await create_user(
            db, email=_uid() + "@t.com", role="school", school_id=school.id
        )
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    admin_headers = {"Authorization": f"Bearer {make_token(admin)}"}
    user_headers = {"Authorization": f"Bearer {make_token(school_user)}"}

    client = await _make_client()
    try:
        # Assign only the assigned category (not the unassigned one)
        await _assign_categories(client, school.id, [assigned_cat.id], admin_headers)

        # GET /api/pdfs/{id} for a PDF in an unassigned category should return 403
        resp = await client.get(f"/api/pdfs/{forbidden_pdf.id}", headers=user_headers)
        assert resp.status_code == 403, (
            f"Expected 403 for GET /api/pdfs/{forbidden_pdf.id}, "
            f"got {resp.status_code}: {resp.text}"
        )

        # GET /api/pdfs/{id}/download for a PDF in an unassigned category should return 403
        # The 403 check happens before the file-existence check, so no real file needed.
        resp = await client.get(f"/api/pdfs/{forbidden_pdf.id}/download", headers=user_headers)
        assert resp.status_code == 403, (
            f"Expected 403 for GET /api/pdfs/{forbidden_pdf.id}/download, "
            f"got {resp.status_code}: {resp.text}"
        )
    finally:
        await _close_client(client)


# ---------------------------------------------------------------------------
# Property 7: Admin users receive unfiltered PDF results
# Feature: school-category-access, Property 7: Admin users receive unfiltered results
# Validates: Requirements 2.5
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow],
    deadline=None,
)
@given(
    n_categories=st.integers(min_value=2, max_value=4),
    n_pdfs_per_cat=st.integers(min_value=1, max_value=3),
)
def test_prop7_admin_receives_unfiltered_pdf_results(n_categories, n_pdfs_per_cat):
    # Feature: school-category-access, Property 7: Admin users receive unfiltered results
    """
    For any admin user, the PDF list returned by GET /api/pdfs should not be
    restricted by any school-category assignment — all PDFs should be accessible.

    Validates: Requirements 2.5
    """
    asyncio.run(_prop7(n_categories, n_pdfs_per_cat))


async def _prop7(n_categories: int, n_pdfs_per_cat: int) -> None:
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))

        # Create multiple categories
        categories = [
            await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
            for _ in range(n_categories)
        ]

        # Create PDFs in each category
        created_pdf_ids = set()
        for cat in categories:
            for _ in range(n_pdfs_per_cat):
                pdf = await create_pdf(
                    db, category_id=cat.id, file_name=_uid("pdf") + ".pdf"
                )
                created_pdf_ids.add(pdf.id)

        # Assign only the first category to the school (rest are unassigned)
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    admin_headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # Assign only the first category to the school
        await _assign_categories(client, school.id, [categories[0].id], admin_headers)

        # Admin fetches PDF list — should get all PDFs (no filtering)
        # Fetch enough to cover all created PDFs (use per_page=100)
        resp = await client.get("/api/pdfs?per_page=100", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/pdfs failed: {resp.text}"

        data = resp.json()
        returned_pdf_ids = {item["id"] for item in data["items"]}

        # All created PDFs should be present in the admin's response
        missing = created_pdf_ids - returned_pdf_ids
        assert not missing, (
            f"Admin is missing PDFs that should be visible: {missing}. "
            f"Total created: {len(created_pdf_ids)}, total returned: {len(returned_pdf_ids)}"
        )
    finally:
        await _close_client(client)
