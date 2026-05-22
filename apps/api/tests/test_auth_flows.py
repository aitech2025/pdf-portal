import pytest

from app.auth import hash_password
from app.models.user import User
from tests.conftest import create_user


@pytest.mark.asyncio
async def test_refresh_token_rotation(client, db_session):
    user = await create_user(db_session, email="rotate@test.com", role="school")

    login_1 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "testpassword"},
    )
    assert login_1.status_code == 200
    refresh_1 = login_1.json()["refreshToken"]

    login_2 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "testpassword"},
    )
    assert login_2.status_code == 200
    refresh_2 = login_2.json()["refreshToken"]
    assert refresh_1 != refresh_2

    old_refresh = await client.post("/api/auth/refresh", json={"refreshToken": refresh_1})
    assert old_refresh.status_code == 401

    new_refresh = await client.post("/api/auth/refresh", json={"refreshToken": refresh_2})
    assert new_refresh.status_code == 200
    assert "token" in new_refresh.json()
    assert "refreshToken" in new_refresh.json()


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(client, db_session):
    user = await create_user(db_session, email="reset@test.com", role="school")

    forgot = await client.post("/api/auth/forgot-password", json={"email": user.email})
    assert forgot.status_code == 200
    reset_token = forgot.json().get("debugToken")
    assert reset_token

    reset = await client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "newPassword": "newpassword123"},
    )
    assert reset.status_code == 200

    old_login = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "testpassword"},
    )
    assert old_login.status_code == 400

    new_login = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "newpassword123"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_email_verification_flow(client, db_session):
    user = User(
        email="verify@test.com",
        password_hash=hash_password("verify123"),
        name="Verify User",
        role="school",
        is_active=True,
        verified=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    blocked_login = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "verify123"},
    )
    assert blocked_login.status_code == 403

    send = await client.post("/api/auth/send-verification", json={"email": user.email})
    assert send.status_code == 200
    verify_token = send.json().get("debugToken")
    assert verify_token

    verify = await client.post("/api/auth/verify-email", json={"token": verify_token})
    assert verify.status_code == 200

    allowed_login = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "verify123"},
    )
    assert allowed_login.status_code == 200
