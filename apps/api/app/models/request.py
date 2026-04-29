from sqlalchemy import String, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class OnboardingRequest(Base):
    __tablename__ = "onboarding_requests"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    point_of_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    point_of_contact_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    grades: Mapped[str | None] = mapped_column(String(100), nullable=True)  # stored as comma-separated
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, approved, rejected
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class UserRequest(Base):
    __tablename__ = "user_requests"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_id: Mapped[str] = mapped_column(String(15), ForeignKey("schools.id"), nullable=False)
    requested_user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_user_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school: Mapped["School"] = relationship("School", back_populates="user_requests")
