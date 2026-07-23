import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
from backend.models import (
    User, UserSettings, UsageLimit, UsageLog, ChatSession, ChatMessage, MessageAttachment, CustomInstruction
)




# 인메모리 테스트용 DB 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


from backend.dependencies import get_current_user

@pytest.fixture(autouse=True)
def reset_db():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)











def test_login_failure_generic_message():
    # 회원가입 진행
    reg_payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "oldpassword123"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # 존재하지 않는 ID로 로그인 시도
    login_payload_invalid_user = {
        "username": "nonexistentuser",
        "password": "somepassword"
    }
    response1 = client.post("/api/v1/auth/login", data=login_payload_invalid_user)
    assert response1.status_code == 401
    assert response1.json()["detail"] == "아이디 또는 비밀번호가 올바르지 않습니다."

    # 올바른 ID, 잘못된 PW로 로그인 시도
    login_payload_invalid_pw = {
        "username": "testuser",
        "password": "wrongpassword"
    }
    response2 = client.post("/api/v1/auth/login", data=login_payload_invalid_pw)
    assert response2.status_code == 401
    assert response2.json()["detail"] == "아이디 또는 비밀번호가 올바르지 않습니다."

def test_password_change_flow():
    # 1. 회원가입
    reg_payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "oldpassword123"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 비밀번호 변경 시도 - 잘못된 현재 비밀번호
    change_payload_wrong = {
        "current_password": "wrongcurrentpassword",
        "new_password": "newpassword123"
    }
    change_res1 = client.post("/api/v1/auth/change-password", json=change_payload_wrong, headers=headers)
    assert change_res1.status_code == 400
    assert change_res1.json()["detail"] == "현재 비밀번호가 올바르지 않습니다."

    # 3. 비밀번호 변경 시도 - 올바른 현재 비밀번호
    change_payload_correct = {
        "current_password": "oldpassword123",
        "new_password": "newpassword123"
    }
    change_res2 = client.post("/api/v1/auth/change-password", json=change_payload_correct, headers=headers)
    assert change_res2.status_code == 200
    assert change_res2.json()["message"] == "비밀번호가 성공적으로 변경되었습니다."

    # 4. 기존 비밀번호로 로그인 실패 확인
    login_old_pw = {
        "username": "testuser",
        "password": "oldpassword123"
    }
    login_res1 = client.post("/api/v1/auth/login", data=login_old_pw)
    assert login_res1.status_code == 401
    assert login_res1.json()["detail"] == "아이디 또는 비밀번호가 올바르지 않습니다."

    # 5. 새 비밀번호로 로그인 성공 확인
    login_new_pw = {
        "username": "testuser",
        "password": "newpassword123"
    }
    login_res2 = client.post("/api/v1/auth/login", data=login_new_pw)
    assert login_res2.status_code == 200
    assert "access_token" in login_res2.json()

def test_check_username_availability():
    # 1. 미존재 아이디 중복확인 -> 사용 가능
    res1 = client.get("/api/v1/auth/check-username?username=newuser")
    assert res1.status_code == 200
    assert res1.json()["is_available"] is True
    assert res1.json()["message"] == "사용 가능한 아이디입니다."

    # 2. 회원가입 진행
    reg_payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # 3. 존재 아이디 중복확인 -> 사용 불가
    res2 = client.get("/api/v1/auth/check-username?username=newuser")
    assert res2.status_code == 200
    assert res2.json()["is_available"] is False
    assert res2.json()["message"] == "이미 사용 중인 아이디입니다."

