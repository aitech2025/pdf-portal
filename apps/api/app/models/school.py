from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class School(Base):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    school_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    point_of_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    point_of_contact_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    principal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grades: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    deactivation_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users: Mapped[list["User"]] = relationship("User", back_populates="school", foreign_keys="User.school_id")
    download_logs: Mapped[list["DownloadLog"]] = relationship("DownloadLog", back_populates="school")
    user_requests: Mapped[list["UserRequest"]] = relationship("UserRequest", back_populates="school")
    team_members: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="school")
