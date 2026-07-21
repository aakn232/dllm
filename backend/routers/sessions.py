from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import ChatMessage, ChatSession, MessageAttachment, User
from backend.schemas import MessageCreate, MessageResponse, SessionCreate, SessionResponse, SessionUpdate

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.get("", response_model=List[SessionResponse])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    empty_sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .filter(~ChatSession.messages.any())
        .all()
    )
    for session in empty_sessions:
        db.delete(session)
    if empty_sessions:
        db.commit()

    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(req: SessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = ChatSession(user_id=current_user.id, title=req.title or "새 대화")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: str,
    req: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = req.title
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return None


@router.post("/{session_id}/messages", response_model=MessageResponse)
def create_message(
    session_id: str,
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content_str = req.content if isinstance(req.content, str) else str(req.content)

    message = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role=req.role,
        content=content_str,
        thinking_content=req.thinking_content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    if req.attachments:
        for att in req.attachments:
            db.add(MessageAttachment(message_id=message.id, file_type=att.file_type, file_url=att.file_url))
        db.commit()
        db.refresh(message)

    if session.title == "새 대화" and req.role == "user":
        session.title = content_str[:30] if len(content_str) > 30 else content_str

    db.commit()
    return message


@router.put("/{session_id}/messages/{message_id}/edit", response_model=MessageResponse)
def edit_and_truncate_messages(
    session_id: str,
    message_id: str,
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    target_msg = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.id == message_id,
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == current_user.id,
        )
        .first()
    )

    if not target_msg:
        target_msg = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.session_id == session_id,
                ChatMessage.user_id == current_user.id,
                ChatMessage.role == "user",
            )
            .order_by(ChatMessage.created_at.desc())
            .first()
        )

    if not target_msg:
        return create_message(session_id, req, current_user, db)

    content_str = req.content if isinstance(req.content, str) else str(req.content)
    target_msg.content = content_str

    db.query(MessageAttachment).filter(MessageAttachment.message_id == target_msg.id).delete()
    if req.attachments:
        for att in req.attachments:
            db.add(MessageAttachment(message_id=target_msg.id, file_type=att.file_type, file_url=att.file_url))

    later_messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == current_user.id,
            ChatMessage.created_at > target_msg.created_at,
        )
        .all()
    )

    for msg in later_messages:
        db.delete(msg)

    db.commit()
    db.refresh(target_msg)
    return target_msg
