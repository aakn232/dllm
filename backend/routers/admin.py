from datetime import date, datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, UserSettings, SystemSettings, UsageLimit, UsageLog, CustomInstruction, ChatSession, ChatMessage
from backend.schemas import (
    UserAdminView, 
    UsageLimitUpdate, 
    UserResponse,
    UserAdminDetailView,
    AdminChatSessionView,
    AdminChatMessageView,
    AdminPasswordResetRequest,
    SystemSettingsSchema,
    SystemSettingsUpdate,
    UserSettingsSchema,
    UserSettingsUpdate,
    CustomInstructionSchema,
    CustomInstructionUpdate,
)
from backend.dependencies import get_current_admin
from backend.routers.auth import get_password_hash

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/users", response_model=List[UserAdminView])
def get_users_list(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    today = date.today()
    
    user_ids = [u.id for u in users]
    
    # 일괄 조회로 N+1 쿼리 문제 해결
    logs = db.query(UsageLog).filter(
        UsageLog.user_id.in_(user_ids),
        UsageLog.date == today
    ).all() if user_ids else []
    log_map = {log.user_id: log for log in logs}
    
    limits = db.query(UsageLimit).filter(
        UsageLimit.user_id.in_(user_ids)
    ).all() if user_ids else []
    limit_map = {limit.user_id: limit for limit in limits}
    
    result = []
    missing_limits = []
    
    for u in users:
        log = log_map.get(u.id)
        today_tokens = log.token_count if log else 0
        today_requests = log.request_count if log else 0
        
        limit = limit_map.get(u.id)
        if not limit:
            limit = UsageLimit(
                user_id=u.id,
                limit_mode="request_only",
                daily_request_limit=30,
                daily_token_limit=None
            )
            missing_limits.append(limit)
            
        limit_mode = limit.limit_mode
        daily_token_limit = limit.daily_token_limit
        daily_request_limit = limit.daily_request_limit
        
        # 남은 한도 계산
        remaining_tokens = None
        if limit_mode in ("both", "token_only") and daily_token_limit is not None:
            remaining_tokens = max(0, daily_token_limit - today_tokens)
        elif limit_mode in ("both", "request_only") and daily_request_limit is not None:
            # 요청 횟수 한도가 있는 경우, 남은 요청 횟수를 remaining_tokens에 근사하여 전달
            remaining_tokens = max(0, daily_request_limit - today_requests)

        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "last_active_at": u.last_active_at,
            "today_token_count": today_tokens,
            "today_request_count": today_requests,
            "limit_mode": limit_mode,
            "daily_token_limit": daily_token_limit,
            "daily_request_limit": daily_request_limit,
            "remaining_tokens": remaining_tokens
        })
        
    if missing_limits:
        db.add_all(missing_limits)
        db.commit()
        
    return result

@router.get("/users/{user_id}/details", response_model=UserAdminDetailView)
def get_user_details(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    today = date.today()
    log = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.date == today
    ).first()
    
    limit = db.query(UsageLimit).filter(UsageLimit.user_id == user_id).first()

    return {
        "id": target_user.id,
        "username": target_user.username,
        "email": target_user.email,
        "is_admin": target_user.is_admin,
        "is_active": target_user.is_active,
        "created_at": target_user.created_at,
        "updated_at": target_user.updated_at,
        "last_active_at": target_user.last_active_at,
        "hashed_password": target_user.hashed_password,
        "settings": target_user.settings,
        "custom_instruction": target_user.custom_instruction,
        "today_token_count": log.token_count if log else 0,
        "today_request_count": log.request_count if log else 0,
        "limit_mode": limit.limit_mode if limit else "both",
        "daily_token_limit": limit.daily_token_limit if limit else None,
        "daily_request_limit": limit.daily_request_limit if limit else None,
    }

@router.get("/users/{user_id}/sessions", response_model=List[AdminChatSessionView])
def get_user_sessions(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()
    
    result = []
    for s in sessions:
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "message_count": msg_count
        })
    return result

@router.get("/users/{user_id}/sessions/{session_id}/messages", response_model=List[AdminChatMessageView])
def get_session_messages(
    user_id: str,
    session_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="해당 대화 세션을 찾을 수 없습니다.")

    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.put("/users/{user_id}/password")
def reset_user_password(
    user_id: str,
    payload: AdminPasswordResetRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    target_user.hashed_password = get_password_hash(payload.new_password)
    target_user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": f"[{target_user.username}] 사용자의 비밀번호가 성공적으로 변경되었습니다."}

@router.put("/users/{user_id}/limit", response_model=UserAdminView)
def update_user_limit(
    user_id: str,
    payload: UsageLimitUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
    limit = db.query(UsageLimit).filter(UsageLimit.user_id == user_id).first()
    if not limit:
        limit = UsageLimit(user_id=user_id)
        db.add(limit)
        
    limit.limit_mode = payload.limit_mode
    limit.daily_token_limit = payload.daily_token_limit
    limit.daily_request_limit = payload.daily_request_limit
    limit.updated_by = current_admin.id
    limit.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(limit)
    
    # 갱신된 사용자의 전체 뷰 반환을 위해 조회
    today = date.today()
    log = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.date == today
    ).first()
    
    today_tokens = log.token_count if log else 0
    today_requests = log.request_count if log else 0
    
    remaining_tokens = None
    if limit.limit_mode in ("both", "token_only") and limit.daily_token_limit is not None:
        remaining_tokens = max(0, limit.daily_token_limit - today_tokens)
    elif limit.limit_mode in ("both", "request_only") and limit.daily_request_limit is not None:
        remaining_tokens = max(0, limit.daily_request_limit - today_requests)
        
    return {
        "id": target_user.id,
        "username": target_user.username,
        "email": target_user.email,
        "is_admin": target_user.is_admin,
        "is_active": target_user.is_active,
        "created_at": target_user.created_at,
        "today_token_count": today_tokens,
        "today_request_count": today_requests,
        "limit_mode": limit.limit_mode,
        "daily_token_limit": limit.daily_token_limit,
        "daily_request_limit": limit.daily_request_limit,
        "remaining_tokens": remaining_tokens
    }

@router.patch("/users/{user_id}/settings", response_model=UserSettingsSchema)
def admin_update_user_settings(
    user_id: str,
    payload: UserSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """관리자가 특정 유저의 AI 모델 파라미터 및 환경 설정(UserSettings)을 수정합니다."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(
            user_id=user_id,
            dark_mode=True,
            enable_thinking=False,
            temperature=0.7,
            top_p=0.9,
            language="ko"
        )
        db.add(settings)

    if payload.dark_mode is not None:
        settings.dark_mode = payload.dark_mode
    if payload.enable_thinking is not None:
        settings.enable_thinking = payload.enable_thinking
    if payload.temperature is not None:
        settings.temperature = payload.temperature
    if payload.top_p is not None:
        settings.top_p = payload.top_p
    if payload.language is not None:
        settings.language = payload.language

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings

@router.patch("/users/{user_id}/custom-instructions", response_model=CustomInstructionSchema)
def admin_update_custom_instructions(
    user_id: str,
    payload: CustomInstructionUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """관리자가 특정 유저의 커스텀 지침 프로필(CustomInstruction)을 수정합니다."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    instruction = db.query(CustomInstruction).filter(CustomInstruction.user_id == user_id).first()
    if not instruction:
        instruction = CustomInstruction(
            user_id=user_id,
            user_profile="",
            response_style="",
            is_enabled=True,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(instruction)

    instruction.user_profile = payload.user_profile
    instruction.response_style = payload.response_style
    instruction.is_enabled = payload.is_enabled
    instruction.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(instruction)
    return instruction

@router.put("/users/{user_id}/activate", response_model=UserResponse)
def toggle_user_activation(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="자기 자신의 활성 상태를 변경할 수 없습니다.")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
    target_user.is_active = not target_user.is_active
    target_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """사용자 및 관련 데이터를 모두 삭제합니다. 관리자 본인 또는 다른 관리자 계정은 삭제할 수 없습니다."""
    # 자기 자신 삭제 방지
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="자기 자신의 계정은 삭제할 수 없습니다.")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 다른 관리자 계정 삭제 방지
    if target_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 계정은 삭제할 수 없습니다.")

    username = target_user.username

    # 연관 데이터 순서대로 삭제 (ChatMessage → ChatSession → UsageLog → UsageLimit → CustomInstruction → UserSettings → User)
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
    for session in sessions:
        db.query(ChatMessage).filter(ChatMessage.session_id == session.id).delete()
    db.query(ChatSession).filter(ChatSession.user_id == user_id).delete()
    db.query(UsageLog).filter(UsageLog.user_id == user_id).delete()
    db.query(UsageLimit).filter(UsageLimit.user_id == user_id).delete()
    db.query(CustomInstruction).filter(CustomInstruction.user_id == user_id).delete()
    db.query(UserSettings).filter(UserSettings.user_id == user_id).delete()
    db.delete(target_user)
    db.commit()

    return {"message": f"[{username}] 사용자 및 관련 데이터가 성공적으로 삭제되었습니다."}

@router.get("/system-settings", response_model=SystemSettingsSchema)
def get_system_settings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        settings = SystemSettings(id=1, max_tokens=8192)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.patch("/system-settings", response_model=SystemSettingsSchema)
def update_system_settings(
    settings_in: SystemSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        settings = SystemSettings(id=1, max_tokens=8192)
        db.add(settings)

    if settings_in.max_tokens is not None:
        settings.max_tokens = settings_in.max_tokens

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings
