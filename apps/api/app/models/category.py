from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Grade 1-5, Grade 6-10
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sub_categories: Mapped[list["SubCategory"]] = relationship("SubCategory", back_populates="category")
    pdfs: Mapped[list["PDF"]] = relationship("PDF", back_populates="category")

class SubCategory(Base):
    __tablename__ = "sub_categories"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    sub_category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[str] = mapped_column(String(15), ForeignKey("categories.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship("Category", back_populates="sub_categories")
    pdfs: Mapped[list["PDF"]] = relationship("PDF", back_populates="sub_category")
