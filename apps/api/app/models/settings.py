from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class MaintenanceMode(Base):
    __tablename__ = "maintenance_mode"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    end_time: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    app_name: Mapped[str] = mapped_column(String(255), nullable=False, default="EduContent")
    app_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    app_favicon: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    secondary_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    support_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    support_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    support_website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_format: Mapped[str | None] = mapped_column(String(50), nullable=True)
    time_format: Mapped[str | None] = mapped_column(String(50), nullable=True)
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    maintenance_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    smtp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    smtp_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_from_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_from_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enable_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_ssl: Mapped[bool] = mapped_column(Boolean, default=False)
    feature_flags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    integrations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    security_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    backup_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False, unique=True)
    theme: Mapped[str] = mapped_column(String(50), default="system")
    language: Mapped[str] = mapped_column(String(10), default="en")
    timezone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_notifications: Mapped[bool] = mapped_column(Boolean, default=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    data_sharing: Mapped[bool] = mapped_column(Boolean, default=False)
    analytics_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="preferences")
