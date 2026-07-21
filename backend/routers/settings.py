from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import DailyUsage, GlobalQuotaPolicy, User, UserQuota, UserSettings
from backend.schemas import MyUsageResponse, UserSettingsPatch, UserSettingsSchema, UserSettingsUpdate

router = APIRouter(prefix="/api/v1", tags=["settings"])


def kst_today_date():
    return (datetime.now(timezone.utc) + timedelta(hours=9)).date()


def get_or_create_settings(db: Session, user_id: str) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings:
        return settings

    settings = UserSettings(user_id=user_id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


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


@router.get("/settings", response_model=UserSettingsSchema)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_create_settings(db, current_user.id)


@router.put("/settings", response_model=UserSettingsSchema)
def put_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_or_create_settings(db, current_user.id)
    data = payload.model_dump()
    for key, value in data.items():
        setattr(settings, key, value)

    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return settings


@router.patch("/settings", response_model=UserSettingsSchema)
def patch_settings(
    payload: UserSettingsPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_or_create_settings(db, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)

    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/usage/me", response_model=MyUsageResponse)
def get_my_usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = kst_today_date()
    usage = db.query(DailyUsage).filter(DailyUsage.user_id == current_user.id, DailyUsage.date == today).first()
    quota = get_or_create_quota(db, current_user.id)
    policy = get_or_create_policy(db)

    return MyUsageResponse(
        date=today,
        request_count=usage.request_count if usage else 0,
        token_count=usage.token_count if usage else 0,
        daily_request_limit=quota.daily_request_limit,
        daily_token_limit=quota.daily_token_limit,
        enforce_request_limit=policy.enforce_request_limit,
        enforce_token_limit=policy.enforce_token_limit,
    )
