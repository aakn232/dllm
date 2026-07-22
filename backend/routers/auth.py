from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.models import User, UserSettings, UsageLimit, CustomInstruction
from backend.schemas import UserRegister, TokenResponse, UserResponse, PasswordChangeRequest
from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # username / email 중복 체크
    existing_user = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 사용자명 또는 이메일입니다."
        )

    # 유저 수 확인하여 첫 유저면 admin으로 임명
    user_count = db.query(User).count()
    is_admin = (user_count == 0)

    hashed_pw = get_password_hash(payload.password)
    
    try:
        # 1. User 생성
        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=hashed_pw,
            is_admin=is_admin,
            is_active=True
        )
        db.add(user)

        # 2. UserSettings 생성
        settings = UserSettings(user=user)
        db.add(settings)

        # 3. UsageLimit 생성
        limit = UsageLimit(
            user=user,
            limit_mode="request_only",
            daily_request_limit=30,
            daily_token_limit=None
        )
        db.add(limit)

        # 4. CustomInstruction 생성
        instruction = CustomInstruction(
            user=user,
            user_profile="",
            response_style="",
            is_enabled=True,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(instruction)
        
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원 가입 처리 중 오류가 발생했습니다: {str(e)}"
        )

    # 토큰 발행 및 반환
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm의 username 필드는 프론트엔드의 username 혹은 email로 입력될 수 있음
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 사용자 계정입니다."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다."
        )
    
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}

@router.get("/check-username")
def check_username(username: str, db: Session = Depends(get_db)):
    if not username or len(username.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사용자 ID는 최소 2자 이상이어야 합니다."
        )
    
    existing_user = db.query(User).filter(User.username == username.strip()).first()
    if existing_user:
        return {
            "is_available": False,
            "message": "이미 사용 중인 아이디입니다."
        }
    
    return {
        "is_available": True,
        "message": "사용 가능한 아이디입니다."
    }


