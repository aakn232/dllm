from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Union
from datetime import datetime

class AttachmentSchema(BaseModel):
    id: Optional[str] = None
    file_type: str
    file_url: str

class MessageCreate(BaseModel):
    role: str
    content: Union[str, List[Any]]  # 텍스트 단일 혹은 멀티모달 객체 리스트
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
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = []

    class Config:
        from_attributes = True

class ChatCompletionRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[dict]
    enable_thinking: bool = True
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


class UserRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserSettingsResponse(BaseModel):
    dark_mode: bool
    enable_thinking: bool
    temperature: float
    top_p: float
    max_tokens: int
    language: str

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    dark_mode: bool
    enable_thinking: bool
    temperature: float
    top_p: float
    max_tokens: int
    language: str


class UserQuotaResponse(BaseModel):
    limit_mode: str
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None

    class Config:
        from_attributes = True


class UserQuotaUpdate(BaseModel):
    limit_mode: str
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None


class UserActiveUpdate(BaseModel):
    is_active: bool


class DailyUsageResponse(BaseModel):
    date: str
    token_count: int
    request_count: int
    quota: UserQuotaResponse
