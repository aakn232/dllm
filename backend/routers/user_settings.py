from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import DailyUsage, User, UserQuota, UserSettings
from backend.schemas import DailyUsageResponse, UserSettingsResponse, UserSettingsUpdate

router = APIRouter(prefix="/api/v1/users/me", tags=["user-settings"])


def _get_or_create_settings(db: Session, user_id: str) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _get_or_create_quota(db: Session, user_id: str) -> UserQuota:
    quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
    if not quota:
        quota = UserQuota(user_id=user_id)
        db.add(quota)
        db.commit()
        db.refresh(quota)
    return quota


@router.get("/settings", response_model=UserSettingsResponse)
def get_my_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_create_settings(db, current_user.id)


@router.put("/settings", response_model=UserSettingsResponse)
def update_my_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = _get_or_create_settings(db, current_user.id)
    settings.dark_mode = payload.dark_mode
    settings.enable_thinking = payload.enable_thinking
    settings.temperature = payload.temperature
    settings.top_p = payload.top_p
    settings.max_tokens = payload.max_tokens
    settings.language = payload.language
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/usage", response_model=DailyUsageResponse)
def get_my_usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = db.query(DailyUsage).filter(DailyUsage.user_id == current_user.id, DailyUsage.date == today).first()
    if not usage:
        usage = DailyUsage(user_id=current_user.id, date=today, token_count=0, request_count=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)

    quota = _get_or_create_quota(db, current_user.id)
    return DailyUsageResponse(
        date=usage.date,
        token_count=usage.token_count,
        request_count=usage.request_count,
        quota=quota,
    )
