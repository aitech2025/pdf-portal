from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.settings import MaintenanceMode, SystemSettings, UserPreferences
from app.models.user import User
from app.auth import get_current_user, require_admin
from app.services.websocket import manager

router = APIRouter(prefix="/api", tags=["settings"])

def _mm_dict(m: MaintenanceMode) -> dict:
    return {
        "id": m.id, "isEnabled": m.is_enabled, "message": m.message,
        "endTime": m.end_time.isoformat() if m.end_time else None,
        "created": m.created.isoformat() if m.created else None,
        "updated": m.updated.isoformat() if m.updated else None,
    }

@router.get("/maintenanceMode")
async def get_maintenance(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MaintenanceMode).limit(1))
    mm = result.scalar_one_or_none()
    if not mm:
        return {"items": [], "totalItems": 0}
    return {"items": [_mm_dict(mm)], "totalItems": 1}

@router.patch("/maintenanceMode/{mm_id}")
async def update_maintenance(mm_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(MaintenanceMode).where(MaintenanceMode.id == mm_id))
    mm = result.scalar_one_or_none()
    if not mm:
        raise HTTPException(404, "Not found")
    if "isEnabled" in body:
        mm.is_enabled = body["isEnabled"]
    if "message" in body:
        mm.message = body["message"]
    await db.commit()
    await db.refresh(mm)
    # Broadcast maintenance change
    await manager.broadcast("maintenanceMode:update", _mm_dict(mm))
    return _mm_dict(mm)

@router.get("/systemSettings")
async def get_system_settings(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(SystemSettings).limit(1))
    ss = result.scalar_one_or_none()
    if not ss:
        return {}
    return _ss_dict(ss)

@router.patch("/systemSettings/{ss_id}")
async def update_system_settings(ss_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(SystemSettings).where(SystemSettings.id == ss_id))
    ss = result.scalar_one_or_none()
    if not ss:
        raise HTTPException(404, "Not found")

    # Direct field mapping
    simple_map = {
        "appName": "app_name", "appDescription": "app_description",
        "primaryColor": "primary_color", "secondaryColor": "secondary_color",
        "supportEmail": "support_email", "supportPhone": "support_phone",
        "timezone": "timezone", "language": "language",
        "maintenanceMode": "maintenance_mode", "maintenanceMessage": "maintenance_message",
        "emailProvider": "email_provider", "smtpHost": "smtp_host",
        "smtpPort": "smtp_port", "smtpUsername": "smtp_username",
        "smtpPassword": "smtp_password", "emailFromAddress": "email_from_address",
        "emailFromName": "email_from_name", "enableTLS": "enable_tls",
        "enableSSL": "enable_ssl",
    }
    for k, v in simple_map.items():
        if k in body:
            setattr(ss, v, body[k])

    # JSON fields
    if "featureFlags" in body:
        ss.feature_flags = body["featureFlags"]
    if "integrations" in body:
        ss.integrations = body["integrations"]
    if "securitySettings" in body:
        ss.security_settings = body["securitySettings"]
    if "backupSettings" in body:
        ss.backup_settings = body["backupSettings"]

    await db.commit()
    await db.refresh(ss)
    return _ss_dict(ss)

@router.get("/userPreferences")
async def get_preferences(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(UserPreferences).where(UserPreferences.user_id == current_user.id))
    prefs = result.scalar_one_or_none()
    if not prefs:
        return {}
    return _prefs_dict(prefs)

@router.patch("/userPreferences/{pref_id}")
async def update_preferences(pref_id: str, body: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(UserPreferences).where(UserPreferences.id == pref_id))
    prefs = result.scalar_one_or_none()
    if not prefs:
        raise HTTPException(404, "Not found")
    for k, v in body.items():
        snake = _to_snake(k)
        if hasattr(prefs, snake):
            setattr(prefs, snake, v)
    await db.commit()
    await db.refresh(prefs)
    return _prefs_dict(prefs)

def _to_snake(name: str) -> str:
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def _ss_dict(ss: SystemSettings) -> dict:
    return {
        "id": ss.id, "appName": ss.app_name, "appDescription": ss.app_description,
        "primaryColor": ss.primary_color, "secondaryColor": ss.secondary_color,
        "supportEmail": ss.support_email, "supportPhone": ss.support_phone,
        "timezone": ss.timezone, "language": ss.language,
        "maintenanceMode": ss.maintenance_mode, "maintenanceMessage": ss.maintenance_message,
        "emailProvider": ss.email_provider, "smtpHost": ss.smtp_host,
        "smtpPort": ss.smtp_port, "smtpUsername": ss.smtp_username,
        "smtpPassword": ss.smtp_password, "emailFromAddress": ss.email_from_address,
        "emailFromName": ss.email_from_name, "enableTLS": ss.enable_tls,
        "enableSSL": ss.enable_ssl,
        "featureFlags": ss.feature_flags or {},
        "integrations": ss.integrations or {},
        "securitySettings": ss.security_settings or {},
        "backupSettings": ss.backup_settings or {},
    }

def _prefs_dict(p: UserPreferences) -> dict:
    return {
        "id": p.id, "userId": p.user_id, "theme": p.theme, "language": p.language,
        "timezone": p.timezone, "emailNotifications": p.email_notifications,
        "inAppNotifications": p.in_app_notifications, "smsNotifications": p.sms_notifications,
        "soundEnabled": p.sound_enabled, "dataSharing": p.data_sharing,
        "analyticsEnabled": p.analytics_enabled,
    }
