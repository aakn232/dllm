from datetime import datetime
from typing import Any, List, Optional, Union

from pydantic import BaseModel, EmailStr, Field


class AttachmentSchema(BaseModel):
    id: Optional[str] = None
    file_type: str
    file_url: str


class MessageCreate(BaseModel):
    role: str
    content: Union[str, List[Any]]
    thinking_content: Optional[str] = None
    attachments: Optional[List[AttachmentSchema]] = []


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    thinking_content: Optional[str] = None
    attachments: List[AttachmentSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    title: Optional[str] = "새 대화"


class SessionUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = []

    class Config:
        from_attributes = True


class ChatCompletionRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[dict]
    enable_thinking: Optional[bool] = None
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 2048


class CustomInstructionSchema(BaseModel):
    id: int = 1
    user_profile: str
    response_style: str
    is_enabled: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomInstructionUpdate(BaseModel):
    user_profile: str = Field(max_length=2000)
    response_style: str = Field(max_length=2000)
    is_enabled: bool


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    theme: str
    language: str
    enable_thinking: bool
    temperature: float
    top_p: float
    max_tokens: int
    custom_instruction_profile: str
    custom_instruction_style: str
    custom_instruction_enabled: bool
    show_thinking: bool
    font_size: str
    updated_at: datetime

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    enable_thinking: Optional[bool] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    custom_instruction_profile: Optional[str] = Field(default=None, max_length=2000)
    custom_instruction_style: Optional[str] = Field(default=None, max_length=2000)
    custom_instruction_enabled: Optional[bool] = None
    show_thinking: Optional[bool] = None
    font_size: Optional[str] = None


class UsageLimitUpdate(BaseModel):
    daily_token_limit: Optional[int] = Field(default=None, ge=1)
    daily_request_limit: Optional[int] = Field(default=None, ge=1)
    limit_mode: str = Field(pattern="^(token|request|both|none)$")


class UserUsageLimitResponse(BaseModel):
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None
    limit_mode: str


class UserDailyUsageResponse(BaseModel):
    date: str
    tokens_used: int
    requests_made: int

    class Config:
        from_attributes = True


class UsageTodayResponse(BaseModel):
    usage: UserDailyUsageResponse
    limits: UserUsageLimitResponse


class AdminUserRow(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    usage_today: UserDailyUsageResponse
    limits: UserUsageLimitResponse
