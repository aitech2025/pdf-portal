from sqlalchemy import String, Boolean, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    pdf_id: Mapped[str] = mapped_column(String(15), ForeignKey("pdfs.id"), nullable=False)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    pdf: Mapped["PDF"] = relationship("PDF", back_populates="favorites")

class PDFRating(Base):
    __tablename__ = "pdf_ratings"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    pdf_id: Mapped[str] = mapped_column(String(15), ForeignKey("pdfs.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pdf: Mapped["PDF"] = relationship("PDF", back_populates="ratings")
    user: Mapped["User"] = relationship("User", back_populates="ratings")

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    pdf_id: Mapped[str] = mapped_column(String(15), ForeignKey("pdfs.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    parent_comment_id: Mapped[str | None] = mapped_column(String(15), ForeignKey("comments.id"), nullable=True)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pdf: Mapped["PDF"] = relationship("PDF", back_populates="comments")
    user: Mapped["User"] = relationship("User", back_populates="comments")
    replies: Mapped[list["Comment"]] = relationship("Comment", foreign_keys=[parent_comment_id])
