from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    recipient_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_method: Mapped[str] = mapped_column(String(50), default="email")  # email, whatsapp, in_app
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, sent, failed
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    recipient: Mapped["User"] = relationship("User", back_populates="notifications")
