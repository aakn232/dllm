import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import Base, get_db
from backend.models import CustomInstruction, DailyUsage, User, UserQuota
from backend.routers.chat import merge_custom_instruction_prompt


# 인메모리 테스트용 DB 설정 (StaticPool 사용하여 세션 간 메모리 DB 유지)
from sqlalchemy.pool import StaticPool
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

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def create_auth_headers(username: str = "tester", email: str = "tester@example.com", password: str = "password123"):
    register_res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    assert register_res.status_code == 201
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"******"}


def test_first_registered_user_is_admin():
    response = client.post("/api/v1/auth/register", json={
        "username": "admin_user",
        "email": "admin@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert response.json()["is_admin"] is True


# 1. GET 기본 레코드 생성 및 반환 검증
def test_get_custom_instructions_creates_default():
    headers = create_auth_headers()
    response = client.get("/api/v1/custom-instructions", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["user_profile"] == ""
    assert data["response_style"] == ""
    assert data["is_enabled"] is True

    # 2번째 GET도 동일 레코드 반환
    res2 = client.get("/api/v1/custom-instructions", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["id"] == data["id"]

# 2. PUT 필수 필드 누락 422 반환 검증
def test_put_custom_instructions_missing_fields_422():
    headers = create_auth_headers()
    # user_profile 누락
    payload = {"response_style": "스타일", "is_enabled": True}
    res = client.put("/api/v1/custom-instructions", json=payload, headers=headers)
    assert res.status_code == 422

# 3. PUT 타입 위반 및 글자수 초과 422 반환 검증
def test_put_custom_instructions_validation_error_422():
    headers = create_auth_headers()
    # 2001자 초과
    too_long = "a" * 2001
    payload = {"user_profile": too_long, "response_style": "스타일", "is_enabled": True}
    res = client.put("/api/v1/custom-instructions", json=payload, headers=headers)
    assert res.status_code == 422

# 4. PUT 멱등성 및 updated_at 동일 유지 검증
def test_put_idempotency_identical_payload():
    headers = create_auth_headers()
    body = {
        "user_profile": "개발자",
        "response_style": "친절하게",
        "is_enabled": True
    }
    res1 = client.put("/api/v1/custom-instructions", json=body, headers=headers)
    assert res1.status_code == 200
    updated_at_1 = res1.json()["updated_at"]

    # 동일 요청 2회 연속 수행
    res2 = client.put("/api/v1/custom-instructions", json=body, headers=headers)
    assert res2.status_code == 200
    updated_at_2 = res2.json()["updated_at"]

    assert updated_at_1 == updated_at_2

# 5. is_enabled=False 메시지 비변이 검증
def test_merge_disabled_instruction():
    inst = CustomInstruction(id=1, user_profile="개발자", response_style="스타일", is_enabled=False)
    msgs = [{"role": "user", "content": "안녕"}]
    res = merge_custom_instruction_prompt(msgs, inst)
    assert res == msgs

# 6. 공백 프롬프트 무시 검증
def test_merge_whitespace_instruction():
    inst = CustomInstruction(id=1, user_profile="   ", response_style="  \n ", is_enabled=True)
    msgs = [{"role": "user", "content": "안녕"}]
    res = merge_custom_instruction_prompt(msgs, inst)
    assert res == msgs

# 7. 딥카피 메모리 및 값 비변이 검증
def test_merge_does_not_mutate_original():
    inst = CustomInstruction(id=1, user_profile="개발자", response_style="간결히", is_enabled=True)
    msgs = [{"role": "user", "content": "테스트"}]
    original_copy = [{"role": "user", "content": "테스트"}]

    res = merge_custom_instruction_prompt(msgs, inst)
    assert msgs == original_copy
    assert res is not msgs
    assert len(res) == 2

# 8. 기존 system 메시지 순서 병합 정합성 검증
def test_merge_with_existing_system_message():
    inst = CustomInstruction(id=1, user_profile="백엔드", response_style="코드 위주", is_enabled=True)
    msgs = [{"role": "system", "content": "기존 시스템 지침"}, {"role": "user", "content": "질문"}]

    res = merge_custom_instruction_prompt(msgs, inst)
    assert len(res) == 2
    assert res[0]["role"] == "system"
    assert "[사용자 맞춤 지침]" in res[0]["content"]
    assert "---" in res[0]["content"]
    assert "기존 시스템 지침" in res[0]["content"]

# 9. 신규 system 메시지 생성 병합 검증
def test_merge_without_system_message():
    inst = CustomInstruction(id=1, user_profile="학생", response_style="쉬운 설명", is_enabled=True)
    msgs = [{"role": "user", "content": "파이썬이란?"}]

    res = merge_custom_instruction_prompt(msgs, inst)
    assert len(res) == 2
    assert res[0]["role"] == "system"
    assert "[사용자 맞춤 지침]" in res[0]["content"]
    assert res[1]["role"] == "user"

# 10. LLM 목업 통합 테스트 (chat/completions 호출시 custom instruction 병합 여부 검증)
@patch("backend.routers.chat.httpx.AsyncClient.send")
def test_chat_completions_with_custom_instructions(mock_send):
    headers = create_auth_headers()

    # session 생성
    session_res = client.post("/api/v1/sessions", json={"title": "테스트"}, headers=headers)
    assert session_res.status_code == 201
    session_id = session_res.json()["id"]

    # 1. 맞춤 지침 등록
    client.put("/api/v1/custom-instructions", json={
        "user_profile": "AI 연구원",
        "response_style": "학술적인 톤",
        "is_enabled": True
    }, headers=headers)

    # mock response 설정
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    async def empty_generator():
        yield "data: {\"choices\":[{\"delta\":{\"content\":\"테스트 응답\"}}]}\n\n"
        yield "data: [DONE]\n\n"
    mock_resp.aiter_lines = empty_generator
    mock_resp.aclose = AsyncMock()
    mock_send.return_value = mock_resp

    response = client.post("/api/v1/chat/completions", json={
        "session_id": session_id,
        "messages": [{"role": "user", "content": "반갑습니다"}]
    }, headers=headers)

    assert response.status_code == 200
    assert mock_send.called
    sent_req = mock_send.call_args[0][0]
    import json
    body = json.loads(sent_req.content.decode("utf-8"))
    first_msg = body["messages"][0]
    assert first_msg["role"] == "system"
    assert "AI 연구원" in first_msg["content"]
    assert "학술적인 톤" in first_msg["content"]

    db = TestingSessionLocal()
    usage = db.query(DailyUsage).first()
    assert usage is not None
    assert usage.request_count == 1
    assert usage.token_count > 0
    db.close()


def test_chat_request_limit_enforced():
    headers = create_auth_headers()
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == "tester").first()
    assert user is not None
    quota = db.query(UserQuota).filter(UserQuota.user_id == user.id).first()
    quota.limit_mode = "requests"
    quota.daily_request_limit = 0
    db.commit()
    db.close()

    response = client.post("/api/v1/chat/completions", json={
        "messages": [{"role": "user", "content": "요청"}]
    }, headers=headers)

    assert response.status_code == 429
    assert response.json()["limit_type"] == "request"
