import uuid

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def gen_id():
    return uuid.uuid4().hex[:15]


class Program(Base):
    __tablename__ = "programs"
    __table_args__ = (
        Index("idx_program_code", "program_code", unique=True),
        Index("idx_program_slug", "slug", unique=True),
        Index("idx_program_status", "status"),
        Index("idx_program_display_order", "display_order"),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    program_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    program_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    categories: Mapped[list["Category"]] = relationship("Category", back_populates="program")
