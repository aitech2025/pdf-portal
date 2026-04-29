"""Bulk creation endpoints for schools and users."""
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.school import School
from app.auth import require_admin, hash_password
from app.services.email import send_user_request_approval_email

router = APIRouter(prefix="/api/bulk", tags=["bulk"])

def _gen_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(secrets.choice(chars) for _ in range(length))

@router.post("/users")
async def bulk_create_users(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """Bulk create users. body.users = list of user dicts."""
    users_data = body.get("users", [])
    if not users_data:
        raise HTTPException(400, "No user data provided")

    SCHOOL_ROLES = {"school_admin", "school_viewer", "teacher"}
    PLATFORM_ROLES = {"platform_admin", "platform_viewer"}
    ALL_ROLES = SCHOOL_ROLES | PLATFORM_ROLES

    results = []
    for row in users_data:
        try:
            role = row.get("role", "school_viewer")
            if role not in ALL_ROLES:
                raise ValueError(f"Invalid role '{role}'. Must be one of: {', '.join(sorted(ALL_ROLES))}")

            school_id = row.get("schoolId")

            if role in SCHOOL_ROLES and not school_id:
                raise ValueError(f"Role '{role}' requires a schoolId")
            if role in PLATFORM_ROLES:
                school_id = None

            # Validate school exists
            if school_id:
                school = await db.get(School, school_id)
                if not school:
                    raise ValueError(f"School '{school_id}' not found")

            existing = await db.scalar(select(User).where(User.email == row["email"]))
            if existing:
                raise ValueError(f"Email '{row['email']}' already in use")

            password = _gen_password()
            user = User(
                email=row["email"],
                password_hash=hash_password(password),
                name=row["name"],
                role=role,
                school_id=school_id,
                mobile_number=row.get("mobileNumber"),
                is_active=True,
                verified=True,
            )
            db.add(user)
            await db.flush()

            # Send welcome email
            try:
                await send_user_request_approval_email(row["email"], row["name"])
            except Exception:
                pass

            results.append({
                "email": row["email"], "name": row["name"], "role": role,
                "generatedPassword": password, "status": "created"
            })
        except Exception as e:
            results.append({"email": row.get("email", "?"), "status": "error", "error": str(e)})

    await db.commit()
    return {
        "results": results,
        "total": len(results),
        "created": sum(1 for r in results if r.get("status") == "created"),
    }
