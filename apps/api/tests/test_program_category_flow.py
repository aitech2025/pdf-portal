import pytest

from app.models.pdf import PDF
from tests.conftest import create_user, make_token


@pytest.mark.asyncio
async def test_program_and_category_code_generation(client, db_session):
    admin = await create_user(db_session, email="program-admin@test.com", role="admin")
    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    program_resp = await client.post(
        "/api/programs",
        json={"programCode": "OLY", "programName": "Olympiad", "displayOrder": 1},
        headers=headers,
    )
    assert program_resp.status_code == 200
    program_id = program_resp.json()["id"]

    category_resp = await client.post(
        "/api/categories",
        json={
            "programId": program_id,
            "categoryName": "Objective",
            "categoryType": "Grade 1-5",
            "displayOrder": 1,
        },
        headers=headers,
    )
    assert category_resp.status_code == 200
    code = category_resp.json().get("categoryCode")
    assert code and code.startswith("OLY-")


@pytest.mark.asyncio
async def test_category_delete_requires_reassign_archive_or_force(client, db_session):
    admin = await create_user(db_session, email="cat-admin@test.com", role="admin")
    headers = {"Authorization": f"Bearer {make_token(admin)}"}

    program_resp = await client.post(
        "/api/programs",
        json={"programCode": "COMP", "programName": "Competitive Exams"},
        headers=headers,
    )
    assert program_resp.status_code == 200
    program_id = program_resp.json()["id"]

    category_resp = await client.post(
        "/api/categories",
        json={
            "programId": program_id,
            "categoryName": "NEET",
            "categoryType": "Grade 6-10",
        },
        headers=headers,
    )
    assert category_resp.status_code == 200
    category_id = category_resp.json()["id"]

    pdf = PDF(
        file_name="neet.pdf",
        file_path="dummy.pdf",
        category_id=category_id,
        status="approved",
        is_active=True,
    )
    db_session.add(pdf)
    await db_session.commit()

    delete_resp = await client.delete(f"/api/categories/{category_id}", headers=headers)
    assert delete_resp.status_code == 409

    archive_resp = await client.delete(f"/api/categories/{category_id}?archive=true", headers=headers)
    assert archive_resp.status_code == 200
    assert archive_resp.json()["item"]["isArchived"] is True
