from sqlalchemy import String, Boolean, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class PDF(Base):
    __tablename__ = "pdfs"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("categories.id"), nullable=True)
    sub_category_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("sub_categories.id"), nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(15), ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, approved, rejected
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pdf_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    version_count: Mapped[int] = mapped_column(Integer, default=1)
    version_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship("Category", back_populates="pdfs")
    sub_category: Mapped["SubCategory"] = relationship("SubCategory", back_populates="pdfs")
    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by])
    versions: Mapped[list["PDFVersion"]] = relationship("PDFVersion", back_populates="pdf")
    download_logs: Mapped[list["DownloadLog"]] = relationship("DownloadLog", back_populates="pdf")
    favorites: Mapped[list["Favorite"]] = relationship("Favorite", back_populates="pdf")
    ratings: Mapped[list["PDFRating"]] = relationship("PDFRating", back_populates="pdf")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="pdf")

class PDFVersion(Base):
    __tablename__ = "pdf_versions"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    pdf_id: Mapped[str] = mapped_column(String(15), ForeignKey("pdfs.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    version_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    upload_date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pdf: Mapped["PDF"] = relationship("PDF", back_populates="versions")
    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by])
