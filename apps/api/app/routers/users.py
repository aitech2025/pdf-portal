import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user, require_admin, hash_password
from app.routers.auth import _user_dict
from app.services.email import send_email

router = APIRouter(prefix="/api/users", tags=["users"])

def _gen_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(secrets.choice(chars) for _ in range(length))

@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort: str = Query("-created"),
    filter: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(User)
    if filter:
        q = q.where(or_(User.name.ilike(f"%{filter}%"), User.email.ilike(f"%{filter}%")))

    desc = sort.startswith("-")
    field = sort.lstrip("+-")
    col = getattr(User, field, User.created)
    q = q.order_by(col.desc() if desc else col.asc())

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    users = result.scalars().all()

    return {"items": [_user_dict(u) for u in users], "totalItems": total, "page": page, "perPage": per_page}

@router.get("/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return _user_dict(user)

@router.post("")
async def create_user(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    existing = await db.scalar(select(User).where(User.email == body["email"]))
    if existing:
        raise HTTPException(400, "Email already in use")

    role = body.get("role", "school_viewer")
    school_id = body.get("schoolId")

    if role in ("school_admin", "school_viewer", "teacher") and not school_id:
        raise HTTPException(400, f"Role '{role}' must be assigned to a school")
    if role in ("platform_admin", "platform_viewer"):
        school_id = None

    user = User(
        email=body["email"],
        password_hash=hash_password(body["password"]),
        name=body["name"],
        role=role,
        school_id=school_id,
        mobile_number=body.get("mobileNumber"),
        is_active=body.get("isActive", True),
        verified=body.get("verified", True),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_dict(user)

@router.patch("/{user_id}")
async def update_user(user_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    field_map = {
        "isActive": "is_active", "name": "name", "role": "role",
        "schoolId": "school_id", "verified": "verified",
        "lockedUntil": "locked_until", "mobileNumber": "mobile_number",
        "email": "email", "address": "address",
    }
    for key, attr in field_map.items():
        if key in body:
            setattr(user, attr, body[key])

    await db.commit()
    await db.refresh(user)
    return _user_dict(user)

@router.delete("/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    await db.delete(user)
    await db.commit()
    return {"message": "Deleted"}

@router.post("/{user_id}/reset-password")
async def reset_password(user_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """
    Reset a user's password.
    body.sendVia: 'email' | 'whatsapp' | 'manual'
    Returns generated password (always, so admin can share manually too).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    new_password = _gen_password()
    user.password_hash = hash_password(new_password)
    await db.commit()

    send_via = body.get("sendVia", "manual")

    if send_via == "email" and user.email:
        html = f"""<h2>Password Reset</h2>
        <p>Dear {user.name},</p>
        <p>Your password has been reset by an administrator.</p>
        <p><strong>New Password:</strong> <code>{new_password}</code></p>
        <p>Please log in and change your password immediately.</p>"""
        try:
            await send_email(user.email, "Your Password Has Been Reset", html)
        except Exception:
            pass

    return {
        "message": "Password reset successfully",
        "generatedPassword": new_password,
        "sentVia": send_via,
        "userEmail": user.email,
        "userName": user.name,
    }
