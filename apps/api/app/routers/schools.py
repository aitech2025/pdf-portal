import uuid
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.school import School
from app.models.user import User
from app.models.log import DownloadLog
from app.auth import get_current_user, require_admin, hash_password
from app.services.email import send_onboarding_approval_email

router = APIRouter(prefix="/api/schools", tags=["schools"])

def _gen_school_id() -> str:
    """Auto-generate a unique school ID like SCH-A1B2C3"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(6))
    return f"SCH-{suffix}"

def _gen_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(secrets.choice(chars) for _ in range(length))

def _school_dict(s: School) -> dict:
    return {
        "id": s.id,
        "schoolName": s.school_name,
        "schoolId": s.school_id,
        "location": s.location,
        "address": s.address,
        "email": s.email,
        "mobileNumber": s.mobile_number,
        "pointOfContactName": s.point_of_contact_name,
        "pointOfContactMobile": s.point_of_contact_mobile,
        "principalName": s.principal_name,
        "grades": s.grades,
        "isActive": s.is_active,
        "deactivationMessage": s.deactivation_message,
        "created": s.created.isoformat() if s.created else None,
        "updated": s.updated.isoformat() if s.updated else None,
    }

@router.get("")
async def list_schools(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort: str = Query("-created"),
    filter: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(School)
    if filter:
        q = q.where(or_(
            School.school_name.ilike(f"%{filter}%"),
            School.school_id.ilike(f"%{filter}%"),
            School.point_of_contact_name.ilike(f"%{filter}%"),
        ))

    desc = sort.startswith("-")
    field = sort.lstrip("+-")
    col_map = {"schoolName": School.school_name, "created": School.created, "schoolId": School.school_id}
    col = col_map.get(field, School.created)
    q = q.order_by(col.desc() if desc else col.asc())

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    schools = result.scalars().all()

    return {"items": [_school_dict(s) for s in schools], "totalItems": total, "page": page, "perPage": per_page}

@router.get("/{school_id}")
async def get_school(school_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(404, "School not found")
    return _school_dict(school)

@router.post("")
async def create_school(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    # Auto-generate school_id — never accept from client
    school_id = _gen_school_id()
    # Ensure uniqueness
    while await db.scalar(select(School).where(School.school_id == school_id)):
        school_id = _gen_school_id()

    school = School(
        school_name=body["schoolName"],
        school_id=school_id,
        location=body.get("location"),
        address=body.get("address"),
        email=body.get("email"),
        mobile_number=body.get("mobileNumber"),
        point_of_contact_name=body.get("pointOfContactName"),
        point_of_contact_mobile=body.get("pointOfContactMobile"),
        principal_name=body.get("principalName"),
        grades=body.get("grades"),
        is_active=body.get("isActive", True),
    )
    db.add(school)
    await db.flush()

    # Create school_admin user if email provided
    password = None
    if body.get("email"):
        password = _gen_password()
        existing = await db.scalar(select(User).where(User.email == body["email"]))
        if not existing:
            admin_user = User(
                email=body["email"],
                password_hash=hash_password(password),
                name=body.get("pointOfContactName") or body["schoolName"],
                role="school_admin",
                school_id=school.id,
                is_active=True,
                verified=True,
            )
            db.add(admin_user)

    await db.commit()
    await db.refresh(school)

    # Send welcome email
    if body.get("email") and password and body.get("sendEmail", True):
        try:
            await send_onboarding_approval_email(
                body["email"], school.school_name,
                body.get("pointOfContactName") or ""
            )
        except Exception:
            pass

    result = _school_dict(school)
    if password:
        result["generatedPassword"] = password
    return result

@router.post("/bulk")
async def bulk_create_schools(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """Bulk create schools from parsed Excel data. body.schools = list of school dicts."""
    schools_data = body.get("schools", [])
    if not schools_data:
        raise HTTPException(400, "No school data provided")

    results = []
    for row in schools_data:
        try:
            school_id = _gen_school_id()
            while await db.scalar(select(School).where(School.school_id == school_id)):
                school_id = _gen_school_id()

            school = School(
                school_name=row["schoolName"],
                school_id=school_id,
                location=row.get("location"),
                address=row.get("address"),
                email=row.get("email"),
                mobile_number=row.get("mobileNumber"),
                point_of_contact_name=row.get("pointOfContactName"),
                grades=row.get("grades"),
                is_active=True,
            )
            db.add(school)
            await db.flush()

            password = None
            if row.get("email"):
                password = _gen_password()
                existing = await db.scalar(select(User).where(User.email == row["email"]))
                if not existing:
                    db.add(User(
                        email=row["email"],
                        password_hash=hash_password(password),
                        name=row.get("pointOfContactName") or row["schoolName"],
                        role="school_admin",
                        school_id=school.id,
                        is_active=True,
                        verified=True,
                    ))

            await db.flush()
            r = _school_dict(school)
            r["generatedPassword"] = password
            r["status"] = "created"
            results.append(r)

            if row.get("email") and password:
                try:
                    await send_onboarding_approval_email(
                        row["email"], school.school_name,
                        row.get("pointOfContactName") or ""
                    )
                except Exception:
                    pass

        except Exception as e:
            results.append({"schoolName": row.get("schoolName", "?"), "status": "error", "error": str(e)})

    await db.commit()
    return {"results": results, "total": len(results), "created": sum(1 for r in results if r.get("status") == "created")}

@router.patch("/{school_id}")
async def update_school(school_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(404, "School not found")

    # schoolId is immutable — never update it
    field_map = {
        "schoolName": "school_name", "location": "location",
        "address": "address", "email": "email", "mobileNumber": "mobile_number",
        "pointOfContactName": "point_of_contact_name", "principalName": "principal_name",
        "grades": "grades", "isActive": "is_active", "deactivationMessage": "deactivation_message",
    }
    for key, attr in field_map.items():
        if key in body:
            setattr(school, attr, body[key])

    await db.commit()
    await db.refresh(school)
    return _school_dict(school)

@router.delete("/{school_id}")
async def delete_school(school_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(404, "School not found")
    await db.delete(school)
    await db.commit()
    return {"message": "Deleted"}

@router.get("/{school_id}/stats")
async def school_stats(school_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total_users = await db.scalar(select(func.count(User.id)).where(User.school_id == school_id))
    total_downloads = await db.scalar(select(func.count(DownloadLog.id)).where(DownloadLog.school_id == school_id))
    return {"totalUsers": total_users, "totalDownloads": total_downloads}


@router.post("/{school_id}/toggle-users")
async def toggle_school_users(school_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """Enable or disable all users belonging to a school."""
    is_active = body.get("isActive", True)
    result = await db.execute(select(User).where(User.school_id == school_id))
    users = result.scalars().all()
    for u in users:
        u.is_active = is_active
    await db.commit()
    return {"updated": len(users), "isActive": is_active}
