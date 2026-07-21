from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import User, UserSettings
from backend.schemas import UserSettingsResponse, UserSettingsUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


VALID_THEMES = {"dark", "light", "system"}
VALID_FONT_SIZES = {"small", "medium", "large"}


def get_or_create_user_settings(db: Session, user_id: str) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=UserSettingsResponse)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_create_user_settings(db, current_user.id)


@router.put("", response_model=UserSettingsResponse)
def update_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_or_create_user_settings(db, current_user.id)
    updates = payload.model_dump(exclude_unset=True)

    if "theme" in updates and updates["theme"] not in VALID_THEMES:
        raise HTTPException(status_code=400, detail="Invalid theme")
    if "font_size" in updates and updates["font_size"] not in VALID_FONT_SIZES:
        raise HTTPException(status_code=400, detail="Invalid font size")

    for key, value in updates.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
