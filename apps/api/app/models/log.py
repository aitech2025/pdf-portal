from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class DownloadLog(Base):
    __tablename__ = "download_logs"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_id: Mapped[str] = mapped_column(String(15), ForeignKey("schools.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    pdf_id: Mapped[str] = mapped_column(String(15), ForeignKey("pdfs.id"), nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("categories.id"), nullable=True)
    sub_category_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("sub_categories.id"), nullable=True)
    download_type: Mapped[str] = mapped_column(String(50), default="single")  # single, bulk
    downloaded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school: Mapped["School"] = relationship("School", back_populates="download_logs")
    user: Mapped["User"] = relationship("User", back_populates="download_logs")
    pdf: Mapped["PDF"] = relationship("PDF", back_populates="download_logs")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # login, upload, download, delete, approve, reject
    action_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timestamp: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="audit_logs")

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    user_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("users.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timestamp: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
