from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_admin
from backend.database import get_db
from backend.models import DailyUsage, User, UserQuota
from backend.schemas import DailyUsageResponse, UserActiveUpdate, UserQuotaUpdate, UserResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


def _get_or_create_quota(db: Session, user_id: str) -> UserQuota:
    quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
    if not quota:
        quota = UserQuota(user_id=user_id)
        db.add(quota)
        db.commit()
        db.refresh(quota)
    return quota


@router.get("/users", response_model=List[UserResponse])
def list_users(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.asc()).all()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return _get_user_or_404(db, user_id)


@router.patch("/users/{user_id}/quota")
def update_user_quota(
    user_id: str,
    payload: UserQuotaUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.limit_mode not in {"tokens", "requests", "both"}:
        raise HTTPException(status_code=422, detail="limit_mode 값이 올바르지 않습니다.")
    _get_user_or_404(db, user_id)
    quota = _get_or_create_quota(db, user_id)
    quota.limit_mode = payload.limit_mode
    quota.daily_token_limit = payload.daily_token_limit
    quota.daily_request_limit = payload.daily_request_limit
    db.commit()
    db.refresh(quota)
    return quota


@router.patch("/users/{user_id}/active", response_model=UserResponse)
def update_user_active(
    user_id: str,
    payload: UserActiveUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(db, user_id)
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}/usage", response_model=DailyUsageResponse)
def get_user_usage(user_id: str, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = db.query(DailyUsage).filter(DailyUsage.user_id == user.id, DailyUsage.date == today).first()
    if not usage:
        usage = DailyUsage(user_id=user.id, date=today, token_count=0, request_count=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    quota = _get_or_create_quota(db, user.id)
    return DailyUsageResponse(
        date=usage.date,
        token_count=usage.token_count,
        request_count=usage.request_count,
        quota=quota,
    )
