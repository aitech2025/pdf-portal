from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="school_viewer")
    # Roles:
    # platform_admin   - full access to all features
    # platform_viewer  - view-only access to all features
    # school_admin     - full access within their school
    # school_viewer    - view-only within their school (display user)
    # teacher          - school-level, strictly mapped to a school
    mobile_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    school_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("schools.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    login_count: Mapped[int] = mapped_column(Integer, default=0)
    login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notification_preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    tour_shown: Mapped[bool] = mapped_column(Boolean, default=False)
    last_tour_step: Mapped[int] = mapped_column(Integer, default=0)
    invitation_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invitation_expires: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invitation_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school: Mapped["School"] = relationship("School", back_populates="users", foreign_keys=[school_id])
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="recipient")
    download_logs: Mapped[list["DownloadLog"]] = relationship("DownloadLog", back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    favorites: Mapped[list["Favorite"]] = relationship("Favorite", back_populates="user")
    ratings: Mapped[list["PDFRating"]] = relationship("PDFRating", back_populates="user")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user")
    preferences: Mapped["UserPreferences"] = relationship("UserPreferences", back_populates="user", uselist=False)
