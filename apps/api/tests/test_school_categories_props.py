"""
Property-based tests for the school_categories router.

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
from sqlalchemy import select, func

from app.main import app
from app.models.school import School, SchoolCategoryAccess
from app.models.category import Category
from app.models.user import User
from app.auth import hash_password, create_access_token

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


async def _make_client():
    """Return an open AsyncClient using the test app."""
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    await client.__aenter__()
    return client


async def _close_client(client: AsyncClient):
    await client.__aexit__(None, None, None)


# ---------------------------------------------------------------------------
# Property 1: Assign-retrieve round trip
# Feature: school-category-access, Property 1: Assign-retrieve round trip
# Validates: Requirements 1.1, 1.2
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(n_categories=st.integers(min_value=1, max_value=5))
def test_prop1_assign_retrieve_round_trip(n_categories):
    # Feature: school-category-access, Property 1: Assign-retrieve round trip
    """
    For any valid set of category IDs, assigning them and then GETting
    the school's categories returns exactly those IDs.

    Validates: Requirements 1.1, 1.2
    """
    asyncio.run(_prop1(n_categories))


async def _prop1(n_categories: int):
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))
        categories = [
            await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
            for _ in range(n_categories)
        ]
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    cat_ids = [c.id for c in categories]
    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # Assign
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": cat_ids},
            headers=headers,
        )
        assert resp.status_code == 200, f"POST failed: {resp.text}"

        # Retrieve
        resp = await client.get(
            f"/api/schools/{school.id}/categories",
            headers=headers,
        )
        assert resp.status_code == 200, f"GET failed: {resp.text}"
        returned_ids = {item["categoryId"] for item in resp.json()["items"]}
        assert returned_ids == set(cat_ids), (
            f"Expected {set(cat_ids)}, got {returned_ids}"
        )
    finally:
        await _close_client(client)


# ---------------------------------------------------------------------------
# Property 2: Assign-remove round trip
# Feature: school-category-access, Property 2: Assign-remove round trip
# Validates: Requirements 1.3
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(dummy=st.none())
def test_prop2_assign_remove_round_trip(dummy):
    # Feature: school-category-access, Property 2: Assign-remove round trip
    """
    Assigning a category then removing it means GET no longer contains it.

    Validates: Requirements 1.3
    """
    asyncio.run(_prop2())


async def _prop2():
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))
        cat = await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # Assign
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": [cat.id]},
            headers=headers,
        )
        assert resp.status_code == 200, f"POST failed: {resp.text}"

        # Remove
        resp = await client.delete(
            f"/api/schools/{school.id}/categories/{cat.id}",
            headers=headers,
        )
        assert resp.status_code == 200, f"DELETE failed: {resp.text}"

        # Retrieve — should not contain the removed category
        resp = await client.get(
            f"/api/schools/{school.id}/categories",
            headers=headers,
        )
        assert resp.status_code == 200, f"GET failed: {resp.text}"
        returned_ids = {item["categoryId"] for item in resp.json()["items"]}
        assert cat.id not in returned_ids, (
            f"Category {cat.id} should have been removed but is still present"
        )
    finally:
        await _close_client(client)


# ---------------------------------------------------------------------------
# Property 3: Duplicate assignment prevention
# Feature: school-category-access, Property 3: Duplicate assignment prevention
# Validates: Requirements 1.4
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(dummy=st.none())
def test_prop3_duplicate_assignment_prevention(dummy):
    # Feature: school-category-access, Property 3: Duplicate assignment prevention
    """
    Assigning the same category twice returns 409 and the count stays 1.

    Validates: Requirements 1.4
    """
    asyncio.run(_prop3())


async def _prop3():
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))
        cat = await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # First assignment — should succeed
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": [cat.id]},
            headers=headers,
        )
        assert resp.status_code == 200, f"First POST failed: {resp.text}"

        # Second assignment — should return 409
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": [cat.id]},
            headers=headers,
        )
        assert resp.status_code == 409, (
            f"Expected 409 on duplicate, got {resp.status_code}: {resp.text}"
        )
    finally:
        await _close_client(client)

    # Count in DB should be exactly 1
    async with TestingSessionLocal() as db:
        count_result = await db.execute(
            select(func.count()).where(
                SchoolCategoryAccess.school_id == school.id,
                SchoolCategoryAccess.category_id == cat.id,
            )
        )
        count = count_result.scalar()
    assert count == 1, f"Expected 1 assignment, found {count}"


# ---------------------------------------------------------------------------
# Property 4: Admin-only authorization
# Feature: school-category-access, Property 4: Admin-only authorization
# Validates: Requirements 1.7
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(role=st.sampled_from(["school", "teacher", "school_admin", "school_viewer"]))
def test_prop4_admin_only_authorization(role):
    # Feature: school-category-access, Property 4: Admin-only authorization
    """
    Non-admin JWT on POST/DELETE returns 403.

    Validates: Requirements 1.7
    """
    asyncio.run(_prop4(role))


async def _prop4(role: str):
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))
        cat = await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")
        non_admin = await create_user(db, email=_uid() + "@t.com", role=role)

    admin_hdrs = {"Authorization": f"Bearer {make_token(admin)}"}
    non_admin_hdrs = {"Authorization": f"Bearer {make_token(non_admin)}"}

    client = await _make_client()
    try:
        # Admin assigns first so DELETE endpoint has a target
        await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": [cat.id]},
            headers=admin_hdrs,
        )

        # Non-admin POST should return 403
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": [cat.id]},
            headers=non_admin_hdrs,
        )
        assert resp.status_code == 403, (
            f"Expected 403 for role={role} on POST, got {resp.status_code}: {resp.text}"
        )

        # Non-admin DELETE should return 403
        resp = await client.delete(
            f"/api/schools/{school.id}/categories/{cat.id}",
            headers=non_admin_hdrs,
        )
        assert resp.status_code == 403, (
            f"Expected 403 for role={role} on DELETE, got {resp.status_code}: {resp.text}"
        )
    finally:
        await _close_client(client)


# ---------------------------------------------------------------------------
# Property 9: Category deletion cascades
# Feature: school-category-access, Property 9: Category deletion cascades
# Validates: Requirements 5.1
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(n_schools=st.integers(min_value=1, max_value=3))
def test_prop9_category_deletion_cascades(n_schools):
    # Feature: school-category-access, Property 9: Category deletion cascades
    """
    Deleting a category removes all school_category_access rows for that category.

    Validates: Requirements 5.1
    """
    asyncio.run(_prop9(n_schools))


async def _prop9(n_schools: int):
    async with TestingSessionLocal() as db:
        cat = await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
        schools = [
            await create_school(db, name=_uid("school"))
            for _ in range(n_schools)
        ]
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # Assign the category to each school
        for school in schools:
            resp = await client.post(
                f"/api/schools/{school.id}/categories",
                json={"categoryIds": [cat.id]},
                headers=headers,
            )
            assert resp.status_code == 200, f"POST failed: {resp.text}"
    finally:
        await _close_client(client)

    # Delete the category directly via DB — cascade should remove assignments
    async with TestingSessionLocal() as db:
        category_obj = await db.get(Category, cat.id)
        await db.delete(category_obj)
        await db.commit()

    # Verify no school_category_access rows remain for this category
    async with TestingSessionLocal() as db:
        count_result = await db.execute(
            select(func.count()).where(
                SchoolCategoryAccess.category_id == cat.id
            )
        )
        count = count_result.scalar()
    assert count == 0, (
        f"Expected 0 assignments after category deletion, found {count}"
    )


# ---------------------------------------------------------------------------
# Property 10: School deletion cascades
# Feature: school-category-access, Property 10: School deletion cascades
# Validates: Requirements 5.2
# ---------------------------------------------------------------------------

@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow], deadline=None,
)
@given(n_categories=st.integers(min_value=1, max_value=3))
def test_prop10_school_deletion_cascades(n_categories):
    # Feature: school-category-access, Property 10: School deletion cascades
    """
    Deleting a school removes all school_category_access rows for that school.

    Validates: Requirements 5.2
    """
    asyncio.run(_prop10(n_categories))


async def _prop10(n_categories: int):
    async with TestingSessionLocal() as db:
        school = await create_school(db, name=_uid("school"))
        categories = [
            await create_category(db, name=_uid("cat"), category_type="Grade 1-5")
            for _ in range(n_categories)
        ]
        admin = await create_user(db, email=_uid() + "@t.com", role="admin")

    cat_ids = [c.id for c in categories]
    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    client = await _make_client()
    try:
        # Assign all categories to the school
        resp = await client.post(
            f"/api/schools/{school.id}/categories",
            json={"categoryIds": cat_ids},
            headers=headers,
        )
        assert resp.status_code == 200, f"POST failed: {resp.text}"
    finally:
        await _close_client(client)

    # Delete the school directly via DB — cascade should remove assignments
    async with TestingSessionLocal() as db:
        school_obj = await db.get(School, school.id)
        await db.delete(school_obj)
        await db.commit()

    # Verify no school_category_access rows remain for this school
    async with TestingSessionLocal() as db:
        count_result = await db.execute(
            select(func.count()).where(
                SchoolCategoryAccess.school_id == school.id
            )
        )
        count = count_result.scalar()
    assert count == 0, (
        f"Expected 0 assignments after school deletion, found {count}"
    )
