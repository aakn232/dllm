from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import CustomInstruction, User
from backend.schemas import CustomInstructionSchema, CustomInstructionUpdate

router = APIRouter(prefix="/api/v1", tags=["custom-instructions"])


def get_or_create_instruction(db: Session, user_id: str) -> CustomInstruction:
    instruction = db.query(CustomInstruction).filter(CustomInstruction.user_id == user_id).first()
    if instruction:
        return instruction

    instruction = CustomInstruction(
        user_id=user_id,
        user_profile="",
        response_style="",
        is_enabled=True,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return instruction


@router.get("/custom-instructions", response_model=CustomInstructionSchema)
def get_custom_instructions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_create_instruction(db, current_user.id)


@router.put("/custom-instructions", response_model=CustomInstructionSchema)
def update_custom_instructions(
    payload: CustomInstructionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    instruction = get_or_create_instruction(db, current_user.id)

    changed = (
        instruction.user_profile != payload.user_profile
        or instruction.response_style != payload.response_style
        or instruction.is_enabled != payload.is_enabled
    )

    if changed:
        instruction.user_profile = payload.user_profile
        instruction.response_style = payload.response_style
        instruction.is_enabled = payload.is_enabled
        instruction.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(instruction)

    return instruction
