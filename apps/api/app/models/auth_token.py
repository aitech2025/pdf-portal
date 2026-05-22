from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def gen_id():
    return uuid.uuid4().hex[:15]


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    __table_args__ = (
        Index("idx_auth_token_user_id", "user_id"),
        Index("idx_auth_token_type", "token_type"),
        Index("idx_auth_token_expires", "expires_at"),
        Index("idx_auth_token_hash", "token_hash", unique=True),
    )

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    token_type: Mapped[str] = mapped_column(String(50), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="auth_tokens")
