from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_admin
from backend.models import User, UserDailyUsage
from backend.routers.usage import get_or_create_limits, get_or_create_usage, utc_today_str
from backend.schemas import AdminUserRow, UsageLimitUpdate, UserDailyUsageResponse, UserUsageLimitResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class ActiveUpdate(BaseModel):
    is_active: bool


@router.get("/users", response_model=list[AdminUserRow])
def list_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    _ = admin
    today = utc_today_str()
    users = db.query(User).order_by(User.created_at.asc()).all()
    rows: list[AdminUserRow] = []
    for user in users:
        usage = get_or_create_usage(db, user.id, today)
        limits = get_or_create_limits(db, user.id)
        rows.append(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "usage_today": usage,
                "limits": {
                    "daily_token_limit": limits.daily_token_limit,
                    "daily_request_limit": limits.daily_request_limit,
                    "limit_mode": limits.limit_mode,
                },
            }
        )
    return rows


@router.put("/users/{user_id}/limits", response_model=UserUsageLimitResponse)
def update_user_limits(
    user_id: str,
    payload: UsageLimitUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = admin
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    limits = get_or_create_limits(db, user_id)
    limits.daily_token_limit = payload.daily_token_limit
    limits.daily_request_limit = payload.daily_request_limit
    limits.limit_mode = payload.limit_mode
    db.commit()
    db.refresh(limits)

    return {
        "daily_token_limit": limits.daily_token_limit,
        "daily_request_limit": limits.daily_request_limit,
        "limit_mode": limits.limit_mode,
    }


@router.get("/users/{user_id}/usage", response_model=list[UserDailyUsageResponse])
def get_user_usage(user_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    _ = admin
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    return (
        db.query(UserDailyUsage)
        .filter(UserDailyUsage.user_id == user_id, UserDailyUsage.date >= start_date)
        .order_by(UserDailyUsage.date.desc())
        .all()
    )


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    _ = admin
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


@router.patch("/users/{user_id}/active", response_model=dict)
def set_user_active(
    user_id: str,
    payload: ActiveUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = admin
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    db.commit()
    return {"detail": "User status updated", "is_active": user.is_active}
