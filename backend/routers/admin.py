from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_admin
from backend.models import DailyUsage, GlobalQuotaPolicy, User, UserQuota
from backend.schemas import (
    AdminUserSummary,
    DailyUsageSchema,
    GlobalQuotaPolicySchema,
    GlobalQuotaPolicyUpdate,
    UserQuotaSchema,
    UserQuotaUpdate,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def kst_today_date():
    return (datetime.now(timezone.utc) + timedelta(hours=9)).date()


def get_or_create_quota(db: Session, user_id: str) -> UserQuota:
    quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
    if quota:
        return quota

    quota = UserQuota(user_id=user_id)
    db.add(quota)
    db.commit()
    db.refresh(quota)
    return quota


def get_or_create_policy(db: Session) -> GlobalQuotaPolicy:
    policy = db.query(GlobalQuotaPolicy).filter(GlobalQuotaPolicy.id == 1).first()
    if policy:
        return policy

    policy = GlobalQuotaPolicy(id=1)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/users", response_model=List[AdminUserSummary])
def list_users(db: Session = Depends(get_db)):
    today = kst_today_date()
    users = db.query(User).order_by(User.created_at.desc()).all()

    usage_map = {
        usage.user_id: usage
        for usage in db.query(DailyUsage).filter(DailyUsage.date == today).all()
    }
    quota_map = {
        quota.user_id: quota
        for quota in db.query(UserQuota).all()
    }

    result: List[AdminUserSummary] = []
    for user in users:
        result.append(
            AdminUserSummary(
                user=user,
                quota=quota_map.get(user.id),
                usage=usage_map.get(user.id),
            )
        )
    return result


@router.get("/users/{user_id}/quota", response_model=UserQuotaSchema)
def get_user_quota(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return get_or_create_quota(db, user_id)


@router.put("/users/{user_id}/quota", response_model=UserQuotaSchema)
def set_user_quota(user_id: str, payload: UserQuotaUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    quota = get_or_create_quota(db, user_id)
    quota.daily_token_limit = payload.daily_token_limit
    quota.daily_request_limit = payload.daily_request_limit
    quota.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(quota)
    return quota


@router.get("/policy", response_model=GlobalQuotaPolicySchema)
def get_policy(db: Session = Depends(get_db)):
    return get_or_create_policy(db)


@router.put("/policy", response_model=GlobalQuotaPolicySchema)
def set_policy(payload: GlobalQuotaPolicyUpdate, db: Session = Depends(get_db)):
    policy = get_or_create_policy(db)
    policy.enforce_token_limit = payload.enforce_token_limit
    policy.enforce_request_limit = payload.enforce_request_limit
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/usage", response_model=List[DailyUsageSchema])
def get_usage(db: Session = Depends(get_db)):
    today = kst_today_date()
    return db.query(DailyUsage).filter(DailyUsage.date == today).all()
