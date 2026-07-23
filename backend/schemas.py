from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Union
from datetime import datetime, date

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

class SessionSummaryResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatCompletionRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[dict]
    enable_thinking: bool = False
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 2048

# --- 신규 추가된 스키마 ---

class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=4)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserSettingsSchema(BaseModel):
    user_id: str
    dark_mode: bool
    enable_thinking: bool = False
    temperature: float
    top_p: float
    max_tokens: int
    language: str
    updated_at: datetime

    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    dark_mode: Optional[bool] = None
    enable_thinking: Optional[bool] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    language: Optional[str] = None

class UsageLimitUpdate(BaseModel):
    limit_mode: str  # "both" | "token_only" | "request_only"
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None

class UserAdminView(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    today_token_count: int
    today_request_count: int
    limit_mode: str
    daily_token_limit: Optional[int]
    daily_request_limit: Optional[int]
    remaining_tokens: Optional[int]

    class Config:
        from_attributes = True

# CustomInstructionSchema 수정 (id -> user_id)
class CustomInstructionSchema(BaseModel):
    user_id: str
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

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=4)

class AdminPasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=4)

class UserAdminDetailView(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    hashed_password: str
    settings: Optional[UserSettingsSchema] = None
    custom_instruction: Optional[CustomInstructionSchema] = None
    today_token_count: int = 0
    today_request_count: int = 0
    limit_mode: str = "both"
    daily_token_limit: Optional[int] = None
    daily_request_limit: Optional[int] = None

class AdminChatSessionView(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

class AdminChatMessageView(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    thinking_content: Optional[str] = None
    created_at: datetime
    attachments: List[AttachmentSchema] = []


