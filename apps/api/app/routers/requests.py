from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.database import get_db
from app.models.request import OnboardingRequest, UserRequest
from app.models.school import School
from app.models.user import User
from app.auth import get_current_user, require_admin
from app.services.email import (
    send_onboarding_request_email, send_onboarding_approval_email,
    send_user_request_email, send_user_request_approval_email,
)

router = APIRouter(prefix="/api", tags=["requests"])

def _onboard_dict(r: OnboardingRequest) -> dict:
    return {
        "id": r.id, "schoolName": r.school_name, "address": r.address,
        "location": r.location, "email": r.email, "mobileNumber": r.mobile_number,
        "pointOfContactName": r.point_of_contact_name, "grades": r.grades,
        "category": r.category, "status": r.status, "rejectionReason": r.rejection_reason,
        "submittedAt": r.submitted_at.isoformat() if r.submitted_at else None,
        "approvedAt": r.approved_at.isoformat() if r.approved_at else None,
        "created": r.created.isoformat() if r.created else None,
    }

def _user_req_dict(r: UserRequest) -> dict:
    return {
        "id": r.id, "schoolId": r.school_id,
        "requestedUserName": r.requested_user_name,
        "requestedUserEmail": r.requested_user_email,
        "requestedUserMobile": r.requested_user_mobile,
        "status": r.status, "rejectionReason": r.rejection_reason,
        "submittedAt": r.submitted_at.isoformat() if r.submitted_at else None,
        "approvedAt": r.approved_at.isoformat() if r.approved_at else None,
        "created": r.created.isoformat() if r.created else None,
    }

# Onboarding Requests
@router.get("/onboardingRequests")
async def list_onboarding(
    page: int = Query(1), per_page: int = Query(10),
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin),
):
    q = select(OnboardingRequest).order_by(OnboardingRequest.created.desc())
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    return {"items": [_onboard_dict(r) for r in result.scalars().all()], "totalItems": total}

@router.post("/onboardingRequests")
async def create_onboarding(body: dict, db: AsyncSession = Depends(get_db)):
    req = OnboardingRequest(
        school_name=body["schoolName"],
        address=body.get("address"),
        location=body.get("location"),
        email=body["email"],
        mobile_number=body.get("mobileNumber"),
        point_of_contact_name=body.get("pointOfContactName"),
        point_of_contact_mobile=body.get("pointOfContactMobile"),
        grades=",".join(body["grades"]) if isinstance(body.get("grades"), list) else body.get("grades"),
        category=body.get("category"),
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Send notification email
    await send_onboarding_request_email(
        req.school_name, req.location or "", req.email,
        req.mobile_number or "", req.grades or ""
    )
    return _onboard_dict(req)

@router.patch("/onboardingRequests/{req_id}")
async def update_onboarding(req_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(OnboardingRequest).where(OnboardingRequest.id == req_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Not found")

    prev_status = req.status
    for k, v in {"status": "status", "rejectionReason": "rejection_reason"}.items():
        if k in body:
            setattr(req, v, body[k])

    if req.status == "approved" and prev_status != "approved":
        req.approved_at = datetime.now(timezone.utc)
        await send_onboarding_approval_email(req.email, req.school_name, req.point_of_contact_name or "")

    await db.commit()
    await db.refresh(req)
    return _onboard_dict(req)

# User Requests
@router.get("/userRequests")
async def list_user_requests(
    page: int = Query(1), per_page: int = Query(10),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(UserRequest)
    if current_user.role != "admin":
        q = q.where(UserRequest.school_id == current_user.school_id)
    q = q.order_by(UserRequest.created.desc())
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    return {"items": [_user_req_dict(r) for r in result.scalars().all()], "totalItems": total}

@router.post("/userRequests")
async def create_user_request(body: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = UserRequest(
        school_id=body["schoolId"],
        requested_user_name=body["requestedUserName"],
        requested_user_email=body["requestedUserEmail"],
        requested_user_mobile=body.get("requestedUserMobile"),
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    school = await db.get(School, req.school_id)
    school_name = school.school_name if school else "Unknown"
    await send_user_request_email(school_name, req.requested_user_name, req.requested_user_email, "teacher")
    return _user_req_dict(req)

@router.patch("/userRequests/{req_id}")
async def update_user_request(req_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(UserRequest).where(UserRequest.id == req_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Not found")

    prev_status = req.status
    for k, v in {"status": "status", "rejectionReason": "rejection_reason"}.items():
        if k in body:
            setattr(req, v, body[k])

    if req.status == "approved" and prev_status != "approved":
        req.approved_at = datetime.now(timezone.utc)
        await send_user_request_approval_email(req.requested_user_email, req.requested_user_name)

    await db.commit()
    await db.refresh(req)
    return _user_req_dict(req)
