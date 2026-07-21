from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import User, UserDailyUsage, UserUsageLimit
from backend.schemas import UsageTodayResponse, UserDailyUsageResponse, UserUsageLimitResponse

router = APIRouter(prefix="/api/v1/usage", tags=["usage"])


def utc_today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_or_create_usage(db: Session, user_id: str, date: str) -> UserDailyUsage:
    usage = db.query(UserDailyUsage).filter(UserDailyUsage.user_id == user_id, UserDailyUsage.date == date).first()
    if not usage:
        usage = UserDailyUsage(user_id=user_id, date=date, tokens_used=0, requests_made=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    return usage


def get_or_create_limits(db: Session, user_id: str) -> UserUsageLimit:
    limits = db.query(UserUsageLimit).filter(UserUsageLimit.user_id == user_id).first()
    if not limits:
        limits = UserUsageLimit(user_id=user_id, limit_mode="both")
        db.add(limits)
        db.commit()
        db.refresh(limits)
    return limits


@router.get("/today", response_model=UsageTodayResponse)
def usage_today(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = utc_today_str()
    usage = get_or_create_usage(db, current_user.id, today)
    limits = get_or_create_limits(db, current_user.id)
    return {
        "usage": usage,
        "limits": {
            "daily_token_limit": limits.daily_token_limit,
            "daily_request_limit": limits.daily_request_limit,
            "limit_mode": limits.limit_mode,
        },
    }


@router.get("/history", response_model=list[UserDailyUsageResponse])
def usage_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    return (
        db.query(UserDailyUsage)
        .filter(UserDailyUsage.user_id == current_user.id, UserDailyUsage.date >= start_date)
        .order_by(UserDailyUsage.date.desc())
        .all()
    )
