from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.user import User
from app.models.auth_token import AuthToken
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    generate_random_token,
    hash_token,
)
from app.models.log import AuditLog
from app.services.email import send_email
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    record: dict

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class RefreshRequest(BaseModel):
    refreshToken: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


class SendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _is_expired(expires_at: datetime, now_utc: datetime) -> bool:
    return _to_utc(expires_at) <= now_utc


def _email_provider_configured() -> bool:
    return bool(settings.SMTP_HOST) or bool(settings.BUILDER_MAILER_API_URL)


async def _revoke_active_refresh_tokens(db: AsyncSession, user_id: str, now: datetime) -> None:
    existing = await db.execute(
        select(AuthToken).where(
            AuthToken.user_id == user_id,
            AuthToken.token_type == "refresh",
            AuthToken.revoked_at.is_(None),
            AuthToken.used_at.is_(None),
            AuthToken.expires_at > now,
        )
    )
    for token in existing.scalars().all():
        token.revoked_at = now


async def _issue_refresh_token(
    db: AsyncSession,
    user: User,
    now: datetime,
    request: Request | None = None,
) -> str:
    raw_token = generate_random_token()
    token_row = AuthToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        token_type="refresh",
        expires_at=now + timedelta(days=30),
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(token_row)
    return raw_token

@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    max_attempts = 5
    lockout_minutes = 15

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    now = datetime.now(timezone.utc)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    locked_until = _to_utc(user.locked_until)
    if locked_until and locked_until > now:
        raise HTTPException(status_code=403, detail="Account is temporarily locked")
    if not verify_password(body.password, user.password_hash):
        user.login_attempts = (user.login_attempts or 0) + 1
        if user.login_attempts >= max_attempts:
            user.locked_until = now + timedelta(minutes=lockout_minutes)
            user.login_attempts = 0
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.verified and user.role not in {"admin", "platform_admin"}:
        raise HTTPException(status_code=403, detail="Account is not verified")

    await _revoke_active_refresh_tokens(db, user.id, now)
    refresh_token = await _issue_refresh_token(db, user, now, request)

    # Update login stats
    user.last_login = now
    user.login_count = (user.login_count or 0) + 1
    user.login_attempts = 0
    user.locked_until = None

    # Audit log
    log = AuditLog(
        user_id=user.id,
        action="login",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "token": token,
        "refreshToken": refresh_token,
        "record": _user_dict(user)
    }


@router.post("/refresh")
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    token_hash_value = hash_token(body.refreshToken)

    token_result = await db.execute(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash_value,
            AuthToken.token_type == "refresh",
        )
    )
    stored_token = token_result.scalar_one_or_none()
    if (
        not stored_token
        or stored_token.revoked_at is not None
        or stored_token.used_at is not None
        or _is_expired(stored_token.expires_at, now)
    ):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.get(User, stored_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    stored_token.revoked_at = now
    refresh_token = await _issue_refresh_token(db, user, now)
    access_token = create_access_token({"sub": user.id, "role": user.role})
    await db.commit()

    return {"token": access_token, "refreshToken": refresh_token, "record": _user_dict(user)}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    debug_token = None

    if user and user.is_active:
        existing = await db.execute(
            select(AuthToken).where(
                AuthToken.user_id == user.id,
                AuthToken.token_type == "password_reset",
                AuthToken.used_at.is_(None),
                AuthToken.revoked_at.is_(None),
            )
        )
        for token in existing.scalars().all():
            token.revoked_at = now

        raw_token = generate_random_token()
        debug_token = raw_token
        db.add(
            AuthToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                token_type="password_reset",
                expires_at=now + timedelta(minutes=30),
            )
        )
        await db.commit()

        await send_email(
            user.email,
            "Reset your I-ICON EduShare password",
            f"<p>Use this reset token to set a new password:</p><p><strong>{raw_token}</strong></p>",
        )

    response = {"message": "If an account exists, a reset link has been sent."}
    if debug_token and not _email_provider_configured():
        response["debugToken"] = debug_token
    return response


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    token_result = await db.execute(
        select(AuthToken).where(
            AuthToken.token_hash == hash_token(body.token),
            AuthToken.token_type == "password_reset",
        )
    )
    reset_token = token_result.scalar_one_or_none()
    if (
        not reset_token
        or reset_token.revoked_at is not None
        or reset_token.used_at is not None
        or _is_expired(reset_token.expires_at, now)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = await db.get(User, reset_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.password_hash = hash_password(body.newPassword)
    reset_token.used_at = now
    await _revoke_active_refresh_tokens(db, user.id, now)
    await db.commit()
    return {"message": "Password reset successful"}


@router.post("/send-verification")
async def send_verification(body: SendVerificationRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    debug_token = None

    if user and user.is_active and not user.verified:
        existing = await db.execute(
            select(AuthToken).where(
                AuthToken.user_id == user.id,
                AuthToken.token_type == "email_verification",
                AuthToken.used_at.is_(None),
                AuthToken.revoked_at.is_(None),
            )
        )
        for token in existing.scalars().all():
            token.revoked_at = now

        raw_token = generate_random_token()
        debug_token = raw_token
        db.add(
            AuthToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                token_type="email_verification",
                expires_at=now + timedelta(hours=24),
            )
        )
        await db.commit()
        await send_email(
            user.email,
            "Verify your I-ICON EduShare account",
            f"<p>Use this verification token to verify your account:</p><p><strong>{raw_token}</strong></p>",
        )

    response = {"message": "If your account requires verification, an email has been sent."}
    if debug_token and not _email_provider_configured():
        response["debugToken"] = debug_token
    return response


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    token_result = await db.execute(
        select(AuthToken).where(
            AuthToken.token_hash == hash_token(body.token),
            AuthToken.token_type == "email_verification",
        )
    )
    verify_token = token_result.scalar_one_or_none()
    if (
        not verify_token
        or verify_token.revoked_at is not None
        or verify_token.used_at is not None
        or _is_expired(verify_token.expires_at, now)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = await db.get(User, verify_token.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.verified = True
    verify_token.used_at = now
    await db.commit()
    return {"message": "Email verified successfully"}

@router.post("/logout")
async def logout(
    body: RefreshRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    if body and body.refreshToken:
        token_result = await db.execute(
            select(AuthToken).where(
                AuthToken.token_hash == hash_token(body.refreshToken),
                AuthToken.user_id == current_user.id,
                AuthToken.token_type == "refresh",
                AuthToken.revoked_at.is_(None),
            )
        )
        token_row = token_result.scalar_one_or_none()
        if token_row:
            token_row.revoked_at = now
    else:
        await _revoke_active_refresh_tokens(db, current_user.id, now)
    await db.commit()
    return {"message": "Logged out"}

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)

@router.patch("/me")
async def update_me(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed = {"name", "avatar", "notification_preferences"}
    for key, val in body.items():
        if key in allowed:
            setattr(current_user, key, val)
    await db.commit()
    await db.refresh(current_user)
    return _user_dict(current_user)

@router.post("/change-password")
async def change_password(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(body.get("oldPassword", ""), current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body["newPassword"])
    await db.commit()
    return {"message": "Password changed"}

def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "schoolId": user.school_id,
        "isActive": user.is_active,
        "verified": user.verified,
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
        "loginCount": user.login_count,
        "twoFactorEnabled": user.two_factor_enabled,
        "onboardingCompleted": user.onboarding_completed,
        "tourShown": user.tour_shown,
        "avatar": user.avatar,
        "mobileNumber": user.mobile_number,
        "address": user.address,
        "created": user.created.isoformat() if user.created else None,
        "updated": user.updated.isoformat() if user.updated else None,
    }
