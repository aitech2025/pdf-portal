from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_id():
    return uuid.uuid4().hex[:15]

class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(String(15), primary_key=True, default=gen_id)
    school_id: Mapped[str] = mapped_column(String(15), ForeignKey("schools.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(15), ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # admin, teacher, student, guest
    invitation_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, accepted, declined
    invited_by: Mapped[str | None] = mapped_column(String(15), ForeignKey("users.id"), nullable=True)
    joined_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school: Mapped["School"] = relationship("School", back_populates="team_members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by])
