from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class School(Base):
    __tablename__ = "schools"
    __table_args__ = (
        Index('idx_school_name', 'school_name'),
        Index('idx_school_is_active', 'is_active'),
        Index('idx_school_created', 'created'),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    school_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True, index=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
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
    category_access: Mapped[list["SchoolCategoryAccess"]] = relationship("SchoolCategoryAccess", back_populates="school", cascade="all, delete-orphan")


class SchoolCategoryAccess(Base):
    __tablename__ = "school_category_access"
    __table_args__ = (
        UniqueConstraint("school_id", "category_id"),
        Index('idx_sca_school_id', 'school_id'),
        Index('idx_sca_category_id', 'category_id'),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_id: Mapped[str] = mapped_column(String(15), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[str] = mapped_column(String(15), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    school: Mapped["School"] = relationship("School", back_populates="category_access")
    category: Mapped["Category"] = relationship("Category", back_populates="school_access")
