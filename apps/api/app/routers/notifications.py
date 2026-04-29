from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.auth import get_current_user
from app.services.websocket import manager
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
    q = select(Notification).where(Notification.recipient_id == current_user.id).order_by(Notification.created.desc())
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    return {"items": [_notif_dict(n) for n in result.scalars().all()], "totalItems": total}

@router.post("")
async def create_notification(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    notif = Notification(
        recipient_id=body["recipientId"],
        type=body["type"],
        subject=body["subject"],
        message=body["message"],
        notification_method=body.get("notificationMethod", "email"),
        status=body.get("status", "pending"),
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # Push real-time
    await manager.send_to_user(notif.recipient_id, "notification:create", _notif_dict(notif))
    return _notif_dict(notif)

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
