import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, Float, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    usage_limit = relationship("UsageLimit", foreign_keys="[UsageLimit.user_id]", back_populates="user", uselist=False, cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")
    custom_instruction = relationship("CustomInstruction", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    dark_mode = Column(Boolean, default=True, nullable=False)
    enable_thinking = Column(Boolean, default=True, nullable=False)
    temperature = Column(Float, default=0.7, nullable=False)
    top_p = Column(Float, default=0.9, nullable=False)
    max_tokens = Column(Integer, default=2048, nullable=False)
    language = Column(String(10), default="ko", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="settings")

class UsageLimit(Base):
    __tablename__ = "usage_limits"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # limit_mode: "both" | "token_only" | "request_only"
    limit_mode = Column(String(20), default="both", nullable=False)
    daily_token_limit = Column(Integer, nullable=True)      # None = 무제한
    daily_request_limit = Column(Integer, nullable=True)    # None = 무제한
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="usage_limit")

class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)         # 날짜 기준 집계
    token_count = Column(Integer, default=0, nullable=False)
    request_count = Column(Integer, default=0, nullable=False)
    
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    user = relationship("User", back_populates="usage_logs")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), default="새 대화")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    thinking_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")

class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    file_type = Column(String(50), nullable=False)  # e.g., image/jpeg, image/png
    file_url = Column(Text, nullable=False)  # Base64 string or file URL
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("ChatMessage", back_populates="attachments")

class CustomInstruction(Base):
    __tablename__ = "custom_instructions"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    user_profile = Column(Text, nullable=False, default="")
    response_style = Column(Text, nullable=False, default="")
    is_enabled = Column(Boolean, nullable=False, default=True)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="custom_instruction")
