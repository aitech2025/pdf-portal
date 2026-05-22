from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index('idx_category_display_order', 'display_order'),
        Index('idx_category_is_active', 'is_active'),
        Index('idx_category_type', 'category_type'),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    program_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("programs.id"), nullable=True, index=True)
    category_code: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True, index=True)
    category_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    category_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Grade 1-5, Grade 6-10
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    program: Mapped["Program"] = relationship("Program", back_populates="categories")
    sub_categories: Mapped[list["SubCategory"]] = relationship("SubCategory", back_populates="category", lazy="selectin")
    pdfs: Mapped[list["PDF"]] = relationship("PDF", back_populates="category")
    school_access: Mapped[list["SchoolCategoryAccess"]] = relationship("SchoolCategoryAccess", back_populates="category", cascade="all, delete-orphan")

class SubCategory(Base):
    __tablename__ = "sub_categories"
    __table_args__ = (
        Index('idx_subcategory_category_id', 'category_id'),
        Index('idx_subcategory_display_order', 'display_order'),
        Index('idx_subcategory_is_active', 'is_active'),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    sub_category_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category_id: Mapped[str] = mapped_column(String(15), ForeignKey("categories.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship("Category", back_populates="sub_categories")
    pdfs: Mapped[list["PDF"]] = relationship("PDF", back_populates="sub_category")
