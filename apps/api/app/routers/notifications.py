from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.models.settings import SystemSettings
from app.auth import get_current_user, require_admin
from app.services.websocket import manager
from app.services.email import send_email
from app.services.whatsapp import send_whatsapp_message
from jose import jwt, JWTError
from app.config import settings

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def _notif_dict(n: Notification) -> dict:
    return {
        "id": n.id, "recipientId": n.recipient_id, "type": n.type,
        "subject": n.subject, "message": n.message,
        "notificationMethod": n.notification_method,
        "status": n.status, "read": n.read,
        "created": n.created.isoformat() if n.created else None,
        "updated": n.updated.isoformat() if n.updated else None,
    }

@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(500, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Notification)
        .where(
            Notification.recipient_id == current_user.id,
            Notification.notification_method == "in_app",
        )
        .order_by(Notification.created.desc())
    )
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    return {
        "items": [_notif_dict(n) for n in result.scalars().all()],
        "totalItems": total,
        "totalPages": (total + per_page - 1) // per_page,
        "page": page,
        "perPage": per_page
    }

@router.post("")
async def create_notification(body: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_recipient = body["recipientId"]
    admin_roles = {"admin", "platform_admin", "platform_viewer", "moderator"}
    if current_user.role not in admin_roles and target_recipient != current_user.id:
        raise HTTPException(403, "Insufficient permissions")
    notif = Notification(
        recipient_id=target_recipient,
        type=body["type"],
        subject=body["subject"],
        message=body["message"],
        notification_method=body.get("notificationMethod", "in_app"),
        status=body.get("status", "pending"),
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # Push real-time
    await manager.send_to_user(notif.recipient_id, "notification:create", _notif_dict(notif))
    return _notif_dict(notif)


@router.post("/admin/send")
async def admin_send_notifications(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    subject = str(body.get("subject", "")).strip()
    message = str(body.get("message", "")).strip()
    notif_type = str(body.get("type", "admin_announcement")).strip()
    channels = body.get("channels") or ["in_app"]
    target_mode = str(body.get("targetMode", "all_schools"))
    school_ids = body.get("schoolIds") or []
    user_ids = body.get("userIds") or []

    if not subject or not message:
        raise HTTPException(400, "subject and message are required")
    if not isinstance(channels, list) or not channels:
        raise HTTPException(400, "At least one channel is required")

    school_roles = {"school", "school_admin", "school_viewer", "teacher"}
    users_query = select(User).where(User.is_active.is_(True), User.role.in_(school_roles))

    if target_mode == "selected_schools":
        if not school_ids:
            raise HTTPException(400, "schoolIds required for selected_schools")
        users_query = users_query.where(User.school_id.in_(school_ids))
    elif target_mode == "selected_users":
        if not user_ids:
            raise HTTPException(400, "userIds required for selected_users")
        users_query = users_query.where(User.id.in_(user_ids))
    elif target_mode != "all_schools":
        raise HTTPException(400, "Invalid targetMode")

    users_result = await db.execute(users_query)
    recipients = users_result.scalars().all()
    if not recipients:
        return {"totalRecipients": 0, "created": 0, "sent": 0, "failed": 0}

    settings_row = await db.scalar(select(SystemSettings).limit(1))
    whatsapp_config = (settings_row.integrations or {}).get("whatsapp", {}) if settings_row else {}

    created = 0
    sent = 0
    failed = 0
    sample_errors = []

    for user in recipients:
        for channel in channels:
            channel_name = str(channel).lower()
            status = "pending"
            error = None

            if channel_name == "in_app":
                status = "sent"
            elif channel_name == "email":
                if user.email:
                    try:
                        await send_email(user.email, subject, f"<p>{message}</p>")
                        status = "sent"
                    except Exception as exc:
                        status = "failed"
                        error = str(exc)
                else:
                    status = "failed"
                    error = "User email not available"
            elif channel_name == "whatsapp":
                mobile = user.mobile_number or ""
                ok, detail = await send_whatsapp_message(mobile, message, whatsapp_config)
                status = "sent" if ok else "failed"
                error = None if ok else detail
            else:
                status = "failed"
                error = f"Unsupported channel: {channel_name}"

            notif = Notification(
                recipient_id=user.id,
                type=notif_type,
                subject=subject,
                message=message,
                notification_method=channel_name,
                status=status,
                read=False,
            )
            db.add(notif)
            await db.flush()

            created += 1
            if status == "sent":
                sent += 1
            else:
                failed += 1
                if error and len(sample_errors) < 10:
                    sample_errors.append({"recipientId": user.id, "channel": channel_name, "error": error})

            if channel_name == "in_app":
                await manager.send_to_user(user.id, "notification:create", _notif_dict(notif))

    await db.commit()

    return {
        "totalRecipients": len(recipients),
        "created": created,
        "sent": sent,
        "failed": failed,
        "errors": sample_errors,
    }

@router.patch("/{notif_id}")
async def update_notification(notif_id: str, body: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id))
    notif = result.scalar_one_or_none()
    if not notif:
        from fastapi import HTTPException
        raise HTTPException(404, "Not found")
    if "read" in body:
        notif.read = body["read"]
    await db.commit()
    await db.refresh(notif)
    return _notif_dict(notif)

@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id))
    notif = result.scalar_one_or_none()
    if not notif:
        from fastapi import HTTPException
        raise HTTPException(404, "Not found")
    await db.delete(notif)
    await db.commit()
    return {"message": "Deleted"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    """WebSocket for real-time notifications. Pass token as query param."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
