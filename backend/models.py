import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    custom_instruction = relationship(
        "CustomInstruction", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    quota = relationship("UserQuota", back_populates="user", uselist=False, cascade="all, delete-orphan")
    daily_usages = relationship("DailyUsage", back_populates="user", cascade="all, delete-orphan")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="새 대화")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    thinking_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="messages")
    session = relationship("ChatSession", back_populates="messages")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_url = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("ChatMessage", back_populates="attachments")


class CustomInstruction(Base):
    __tablename__ = "custom_instructions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    user_profile = Column(Text, nullable=False, default="")
    response_style = Column(Text, nullable=False, default="")
    is_enabled = Column(Boolean, nullable=False, default=True)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="custom_instruction")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme = Column(String(20), nullable=False, default="system")
    language = Column(String(10), nullable=False, default="ko")
    font_size = Column(String(20), nullable=False, default="medium")
    enable_thinking = Column(Boolean, nullable=False, default=True)
    temperature = Column(Float, nullable=False, default=0.7)
    top_p = Column(Float, nullable=False, default=0.9)
    max_tokens = Column(Integer, nullable=False, default=2048)
    send_on_enter = Column(Boolean, nullable=False, default=True)
    show_thinking = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="settings")


class UserQuota(Base):
    __tablename__ = "user_quotas"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    daily_token_limit = Column(Integer, nullable=True)
    daily_request_limit = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="quota")


class DailyUsage(Base):
    __tablename__ = "daily_usages"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_usage_user_date"),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)
    request_count = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="daily_usages")


class GlobalQuotaPolicy(Base):
    __tablename__ = "global_quota_policy"

    id = Column(Integer, primary_key=True, default=1)
    enforce_token_limit = Column(Boolean, nullable=False, default=False)
    enforce_request_limit = Column(Boolean, nullable=False, default=False)
