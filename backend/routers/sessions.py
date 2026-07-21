from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ChatSession, ChatMessage, MessageAttachment, User
from backend.schemas import (
    SessionCreate, SessionUpdate, SessionResponse, 
    MessageCreate, MessageResponse
)
from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])

@router.get("", response_model=List[SessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 로그인한 사용자의 빈 세션(메시지가 없는 세션) 자동 정리 및 필터링
    empty_sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ~ChatSession.messages.any()
    ).all()
    for s in empty_sessions:
        db.delete(s)
    if empty_sessions:
        db.commit()

    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()
    return sessions

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    req: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = ChatSession(title=req.title or "새 대화", user_id=current_user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: str,
    req: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = req.title
    db.commit()
    db.refresh(session)
    return session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return None

@router.post("/{session_id}/messages", response_model=MessageResponse)
def create_message(
    session_id: str,
    req: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content_str = req.content if isinstance(req.content, str) else str(req.content)

    message = ChatMessage(
        session_id=session_id,
        role=req.role,
        content=content_str,
        thinking_content=req.thinking_content
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    if req.attachments:
        for att in req.attachments:
            attachment = MessageAttachment(
                message_id=message.id,
                file_type=att.file_type,
                file_url=att.file_url
            )
            db.add(attachment)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    메시지 수정 및 해당 메시지 시점 이후의 모든 대화 메시지들을 DB에서 롤백/트렁케이트(Truncate) 처리
    """
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    target_msg = db.query(ChatMessage).filter(
        ChatMessage.id == message_id, 
        ChatMessage.session_id == session_id
    ).first()

    # ID로 찾지 못한 경우 (임시 클라이언트 ID인 경우 등), 세션의 마지막 user 메시지를 타깃으로 사용
    if not target_msg:
        target_msg = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id,
            ChatMessage.role == "user"
        ).order_by(ChatMessage.created_at.desc()).first()

    if not target_msg:
        # 메시지가 정말 없으면 신규 생성
        return create_message(session_id, req, db, current_user)

    # 1. 대상 메시지 내용 업데이트
    content_str = req.content if isinstance(req.content, str) else str(req.content)
    target_msg.content = content_str
    
    # 기존 첨부파일 삭제 후 재등록
    db.query(MessageAttachment).filter(MessageAttachment.message_id == target_msg.id).delete()
    if req.attachments:
        for att in req.attachments:
            db.add(MessageAttachment(
                message_id=target_msg.id,
                file_type=att.file_type,
                file_url=att.file_url
            ))

    # 2. 대상 메시지의 created_at 시점보다 이후에 생성된 세션 내 모든 메시지 삭제 (Truncate)
    later_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.created_at > target_msg.created_at
    ).all()

    for msg in later_messages:
        db.delete(msg)

    db.commit()
    db.refresh(target_msg)
    return target_msg
