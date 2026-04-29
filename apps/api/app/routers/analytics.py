from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.school import School
from app.models.pdf import PDF
from app.models.log import DownloadLog, AuditLog
from app.models.request import OnboardingRequest, UserRequest
from app.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_users = await db.scalar(select(func.count(User.id)))
    total_schools = await db.scalar(select(func.count(School.id)))
    total_pdfs = await db.scalar(select(func.count(PDF.id)))
    total_downloads = await db.scalar(select(func.count(DownloadLog.id)))
    pending_pdfs = await db.scalar(select(func.count(PDF.id)).where(PDF.status == "pending"))
    pending_user_reqs = await db.scalar(select(func.count(UserRequest.id)).where(UserRequest.status == "pending"))
    pending_onboarding = await db.scalar(select(func.count(OnboardingRequest.id)).where(OnboardingRequest.status == "pending"))

    return {
        "metrics": {
            "totalUsers": total_users,
            "totalSchools": total_schools,
            "totalPdfs": total_pdfs,
            "totalDownloads": total_downloads,
        },
        "pendingItems": {
            "pdfApprovals": pending_pdfs,
            "userRequests": pending_user_reqs,
            "schoolRegistrations": pending_onboarding,
        },
    }

@router.get("/analytics/overview")
async def overview(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    total_users = await db.scalar(select(func.count(User.id)))
    total_pdfs = await db.scalar(select(func.count(PDF.id)))
    total_downloads = await db.scalar(select(func.count(DownloadLog.id)))
    total_schools = await db.scalar(select(func.count(School.id)))
    return {
        "overview": {
            "totalUsers": total_users,
            "totalPdfs": total_pdfs,
            "totalDownloads": total_downloads,
            "totalSchools": total_schools,
        }
    }
