from datetime import date, datetime
from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    user_id: str
    role: str
    content: str
    thinking_content: Optional[str] = None
    attachments: List[AttachmentSchema] = []
    created_at: datetime


class SessionCreate(BaseModel):
    title: Optional[str] = "새 대화"


class SessionUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = []


class ChatCompletionRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[dict]
    enable_thinking: bool = True
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 2048


class CustomInstructionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    user_profile: str
    response_style: str
    is_enabled: bool
    updated_at: datetime


class CustomInstructionUpdate(BaseModel):
    user_profile: str = Field(max_length=2000)
    response_style: str = Field(max_length=2000)
    is_enabled: bool


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: EmailStr
    is_admin: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserSettingsSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    theme: Literal["light", "dark", "system"] = "system"
    language: str = "ko"
    font_size: Literal["small", "medium", "large"] = "medium"
    enable_thinking: bool = True
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2048
    send_on_enter: bool = True
    show_thinking: bool = True
    updated_at: datetime


class UserSettingsUpdate(BaseModel):
    theme: Literal["light", "dark", "system"] = "system"
    language: str = "ko"
    font_size: Literal["small", "medium", "large"] = "medium"
    enable_thinking: bool = True
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    max_tokens: int = Field(default=2048, ge=1)
    send_on_enter: bool = True
    show_thinking: bool = True


class UserSettingsPatch(BaseModel):
    theme: Optional[Literal["light", "dark", "system"]] = None
    language: Optional[str] = None
    font_size: Optional[Literal["small", "medium", "large"]] = None
    enable_thinking: Optional[bool] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    send_on_enter: Optional[bool] = None
    show_thinking: Optional[bool] = None


class UserQuotaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None
    updated_at: datetime


class UserQuotaUpdate(BaseModel):
    daily_token_limit: Optional[int] = Field(default=None, ge=1)
    daily_request_limit: Optional[int] = Field(default=None, ge=1)


class DailyUsageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    date: date
    token_count: int
    request_count: int


class GlobalQuotaPolicySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enforce_token_limit: bool
    enforce_request_limit: bool


class GlobalQuotaPolicyUpdate(BaseModel):
    enforce_token_limit: bool
    enforce_request_limit: bool


class AdminUserSummary(BaseModel):
    user: UserResponse
    quota: Optional[UserQuotaSchema] = None
    usage: Optional[DailyUsageSchema] = None


class MyUsageResponse(BaseModel):
    date: date
    request_count: int
    token_count: int
    daily_request_limit: Optional[int] = None
    daily_token_limit: Optional[int] = None
    enforce_request_limit: bool
    enforce_token_limit: bool
