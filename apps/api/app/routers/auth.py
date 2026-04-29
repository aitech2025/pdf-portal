from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from app.database import get_db
from app.models.user import User
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.log import AuditLog

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

@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        raise HTTPException(status_code=403, detail="Account is temporarily locked")

    # Update login stats
    user.last_login = now
    user.login_count = (user.login_count or 0) + 1
    user.login_attempts = 0

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
        "record": _user_dict(user)
    }

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
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
