from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CustomInstruction
from backend.schemas import CustomInstructionSchema, CustomInstructionUpdate

router = APIRouter(prefix="/api/v1", tags=["custom-instructions"])

def get_or_create_instruction(db: Session) -> CustomInstruction:
    instruction = db.query(CustomInstruction).filter(CustomInstruction.id == 1).first()
    if not instruction:
        instruction = CustomInstruction(
            id=1,
            user_profile="",
            response_style="",
            is_enabled=True,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(instruction)
        db.commit()
        db.refresh(instruction)
    return instruction

@router.get("/custom-instructions", response_model=CustomInstructionSchema)
def get_custom_instructions(db: Session = Depends(get_db)):
    return get_or_create_instruction(db)

@router.put("/custom-instructions", response_model=CustomInstructionSchema)
def update_custom_instructions(
    payload: CustomInstructionUpdate,
    db: Session = Depends(get_db)
):
    instruction = get_or_create_instruction(db)

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
