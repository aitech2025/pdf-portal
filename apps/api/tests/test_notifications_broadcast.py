import pytest

from tests.conftest import TestingSessionLocal, create_school, create_user, make_token


@pytest.mark.asyncio
async def test_admin_broadcast_to_selected_school_users(client):
    async with TestingSessionLocal() as db:
        school_a = await create_school(db, name="School A")
        school_b = await create_school(db, name="School B")
        admin = await create_user(db, email="admin-broadcast@test.com", role="admin")
        user_a = await create_user(db, email="a@test.com", role="school_admin", school_id=school_a.id)
        _user_b = await create_user(db, email="b@test.com", role="school_admin", school_id=school_b.id)

    admin_headers = {"Authorization": f"Bearer {make_token(admin)}"}
    user_a_headers = {"Authorization": f"Bearer {make_token(user_a)}"}

    send_resp = await client.post(
        "/api/notifications/admin/send",
        json={
            "subject": "Platform update",
            "message": "New update available",
            "type": "bulk_announcement",
            "channels": ["in_app"],
            "targetMode": "selected_schools",
            "schoolIds": [school_a.id],
        },
        headers=admin_headers,
    )
    assert send_resp.status_code == 200, send_resp.text
    payload = send_resp.json()
    assert payload["totalRecipients"] >= 1
    assert payload["failed"] == 0

    list_resp = await client.get("/api/notifications", headers=user_a_headers)
    assert list_resp.status_code == 200, list_resp.text
    items = list_resp.json()["items"]
    assert len(items) >= 1
    assert all(item["notificationMethod"] == "in_app" for item in items)


@pytest.mark.asyncio
async def test_non_admin_cannot_broadcast(client):
    async with TestingSessionLocal() as db:
        school = await create_school(db, name="School C")
        non_admin = await create_user(db, email="teacher-broadcast@test.com", role="teacher", school_id=school.id)

    headers = {"Authorization": f"Bearer {make_token(non_admin)}"}
    resp = await client.post(
        "/api/notifications/admin/send",
        json={
            "subject": "Restricted",
            "message": "Should fail",
            "channels": ["in_app"],
            "targetMode": "all_schools",
        },
        headers=headers,
    )
    assert resp.status_code == 403
