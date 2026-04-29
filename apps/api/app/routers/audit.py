from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.database import get_db
from app.models.log import AuditLog, DownloadLog
from app.models.user import User
from app.auth import require_admin, get_current_user
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api", tags=["audit"])

@router.get("/auditLogs")
async def list_audit_logs(
    page: int = Query(1), per_page: int = Query(20),
    action: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin),
):
    q = select(AuditLog)

    if action:
        q = q.where(AuditLog.action == action)
    if date_from:
        try:
            q = q.where(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            q = q.where(AuditLog.timestamp <= dt)
        except ValueError:
            pass

    q = q.order_by(AuditLog.timestamp.desc())
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()

    # Fetch user names in one query
    user_ids = list({l.user_id for l in logs if l.user_id})
    users_map = {}
    if user_ids:
        ur = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in ur.scalars().all():
            users_map[u.id] = u

    return {
        "items": [{
            "id": l.id,
            "userId": l.user_id,
            "action": l.action,
            "actionDetails": l.action_details,
            "ipAddress": l.ip_address,
            "resourceType": l.resource_type,
            "resourceId": l.resource_id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "created": l.created.isoformat() if l.created else None,
            "expand": {
                "userId": {
                    "id": users_map[l.user_id].id,
                    "name": users_map[l.user_id].name,
                    "email": users_map[l.user_id].email,
                } if l.user_id and l.user_id in users_map else None
            }
        } for l in logs],
        "totalItems": total,
    }

@router.get("/downloadLogs")
async def list_download_logs(
    page: int = Query(1), per_page: int = Query(20),
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin),
):
    q = select(DownloadLog).order_by(DownloadLog.downloaded_at.desc())
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()
    return {
        "items": [{
            "id": l.id, "schoolId": l.school_id, "userId": l.user_id,
            "pdfId": l.pdf_id, "downloadType": l.download_type,
            "downloadedAt": l.downloaded_at.isoformat() if l.downloaded_at else None,
        } for l in logs],
        "totalItems": total,
    }
