from datetime import date, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, UsageLimit, UsageLog
from backend.schemas import UserAdminView, UsageLimitUpdate, UserResponse
from backend.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/users", response_model=List[UserAdminView])
def get_users_list(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    today = date.today()
    
    result = []
    for u in users:
        # 오늘 로그 조회
        log = db.query(UsageLog).filter(
            UsageLog.user_id == u.id,
            UsageLog.date == today
        ).first()
        
        today_tokens = log.token_count if log else 0
        today_requests = log.request_count if log else 0
        
        # 한도 정보 조회
        limit = db.query(UsageLimit).filter(UsageLimit.user_id == u.id).first()
        if not limit:
            # 존재하지 않는 경우 기본 레코드 생성
            limit = UsageLimit(
                user_id=u.id,
                limit_mode="request_only",
                daily_request_limit=30,
                daily_token_limit=None
            )
            db.add(limit)
            db.commit()
            db.refresh(limit)
            
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
            "today_token_count": today_tokens,
            "today_request_count": today_requests,
            "limit_mode": limit_mode,
            "daily_token_limit": daily_token_limit,
            "daily_request_limit": daily_request_limit,
            "remaining_tokens": remaining_tokens
        })
        
    return result

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
