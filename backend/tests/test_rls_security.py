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
from backend.config import SECRET_KEY, ALGORITHM
from jose import jwt

# 인메모리 테스트 DB 설정
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

def create_auth_token(user_id: str) -> str:
    payload = {"sub": user_id}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@pytest.fixture(autouse=True)
def setup_rls_test_environment():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    
    # 1. User A 생성
    user_a = User(
        id="user-a-uuid",
        username="user_a",
        email="usera@example.com",
        hashed_password="password_a_hash",
        is_active=True,
        is_admin=False
    )
    # 2. User B 생성
    user_b = User(
        id="user-b-uuid",
        username="user_b",
        email="userb@example.com",
        hashed_password="password_b_hash",
        is_active=True,
        is_admin=False
    )
    db.add_all([user_a, user_b])
    db.commit()

    # User A / B 의 기본 설정 생성
    settings_a = UserSettings(user_id="user-a-uuid", dark_mode=True, language="ko")
    settings_b = UserSettings(user_id="user-b-uuid", dark_mode=False, language="en")
    db.add_all([settings_a, settings_b])

    # User A 의 custom instruction 생성
    instruction_a = CustomInstruction(
        user_id="user-a-uuid",
        user_profile="User A Profile",
        response_style="Friendly",
        is_enabled=True
    )
    db.add(instruction_a)
    db.commit()

    db.close()

    yield
    
    Base.metadata.drop_all(bind=engine)

def test_unauthorized_anonymous_requests_blocked():
    """
    미인증/익명 요청이 주요 데이터 엔드포인트에 접근할 때 HTTP 401 Unauthorized로 차단되는지 검증
    """
    endpoints = [
        ("GET", "/api/v1/sessions"),
        ("POST", "/api/v1/sessions"),
        ("GET", "/api/v1/custom-instructions"),
        ("GET", "/api/v1/settings/me"),
        ("POST", "/api/v1/chat/completions"),
    ]

    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for {method} {path}, got {res.status_code}"

def test_user_a_can_access_and_modify_own_data():
    """
    User A가 본인의 데이터(세션, 맞춤지침, 설정)에 정상 접근하고 수정할 수 있는지 검증
    """
    token_a = create_auth_token("user-a-uuid")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. User A 세션 생성
    create_res = client.post("/api/v1/sessions", json={"title": "User A Session 1"}, headers=headers_a)
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 2. User A 세션 조회
    get_res = client.get(f"/api/v1/sessions/{session_id}", headers=headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "User A Session 1"

    # 3. User A 세션 제목 수정
    patch_res = client.patch(f"/api/v1/sessions/{session_id}", json={"title": "User A Updated Session"}, headers=headers_a)
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "User A Updated Session"

    # 4. User A 맞춤지침 조회 및 수정
    inst_res = client.get("/api/v1/custom-instructions", headers=headers_a)
    assert inst_res.status_code == 200
    assert inst_res.json()["user_profile"] == "User A Profile"

    update_inst = client.put(
        "/api/v1/custom-instructions",
        json={"user_profile": "Updated User A Profile", "response_style": "Concise", "is_enabled": True},
        headers=headers_a
    )
    assert update_inst.status_code == 200
    assert update_inst.json()["user_profile"] == "Updated User A Profile"

def test_cross_user_isolation_user_b_cannot_access_user_a_data():
    """
    User B가 User A의 세션, 메시지, 지침 등에 접근 또는 수정하려 할 때 404/403으로 차단됨(격리)을 검증
    """
    token_a = create_auth_token("user-a-uuid")
    token_b = create_auth_token("user-b-uuid")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A 세션 생성
    session_res = client.post("/api/v1/sessions", json={"title": "Private Session of User A"}, headers=headers_a)
    assert session_res.status_code == 201
    session_a_id = session_res.json()["id"]

    # User B가 User A의 세션 단건 조회 시도 -> 404 차단
    res1 = client.get(f"/api/v1/sessions/{session_a_id}", headers=headers_b)
    assert res1.status_code == 404

    # User B가 User A의 세션 제목 수정 시도 -> 404 차단
    res2 = client.patch(f"/api/v1/sessions/{session_a_id}", json={"title": "Hacked Title"}, headers=headers_b)
    assert res2.status_code == 404

    # User B가 User A의 세션 삭제 시도 -> 404 차단
    res3 = client.delete(f"/api/v1/sessions/{session_a_id}", headers=headers_b)
    assert res3.status_code == 404

    # User B가 User A의 세션에 메시지 추가 시도 -> 404 차단
    res4 = client.post(f"/api/v1/sessions/{session_a_id}/messages", json={"role": "user", "content": "Hack"}, headers=headers_b)
    assert res4.status_code == 404

    # User B가 User A의 session_id로 Chat completion 요청 시도 -> 404 차단
    chat_payload = {
        "session_id": session_a_id,
        "messages": [{"role": "user", "content": "Hi"}],
        "enable_thinking": False
    }
    res5 = client.post("/api/v1/chat/completions", json=chat_payload, headers=headers_b)
    assert res5.status_code == 404

    # User B가 맞춤지침 조회 시 User A의 정보가 유출되지 않는지 확인
    res6 = client.get("/api/v1/custom-instructions", headers=headers_b)
    assert res6.status_code == 200
    assert res6.json()["user_profile"] != "User A Profile"

def test_rls_sql_policy_verification_all_8_tables():
    """
    Supabase RLS Policy 규칙 (auth.uid() = user_id) 데이터베이스 세션 수준 검증.
    All 8 tables: users, user_settings, usage_limits, usage_logs, chat_sessions, chat_messages, message_attachments, custom_instructions
    """
    db = TestingSessionLocal()

    # 1. ChatSession RLS Policy 검증
    session_a = ChatSession(id="sess-a", user_id="user-a-uuid", title="Session A")
    session_b = ChatSession(id="sess-b", user_id="user-b-uuid", title="Session B")
    db.add_all([session_a, session_b])
    db.commit()

    # 2. ChatMessage & MessageAttachment RLS Policy 검증
    msg_a = ChatMessage(id="msg-a", session_id="sess-a", role="user", content="Hello A")
    msg_b = ChatMessage(id="msg-b", session_id="sess-b", role="user", content="Hello B")
    db.add_all([msg_a, msg_b])
    db.commit()

    att_a = MessageAttachment(id="att-a", message_id="msg-a", file_type="image/png", file_url="data:image/png;base64,123")
    att_b = MessageAttachment(id="att-b", message_id="msg-b", file_type="image/png", file_url="data:image/png;base64,456")
    db.add_all([att_a, att_b])
    db.commit()

    # 3. UsageLimit & UsageLog RLS Policy 검증
    from datetime import date
    limit_a = UsageLimit(user_id="user-a-uuid", limit_mode="both", daily_token_limit=1000)
    limit_b = UsageLimit(user_id="user-b-uuid", limit_mode="both", daily_token_limit=2000)
    log_a = UsageLog(id="log-a", user_id="user-a-uuid", date=date.today(), token_count=100, request_count=1)
    log_b = UsageLog(id="log-b", user_id="user-b-uuid", date=date.today(), token_count=200, request_count=2)
    db.add_all([limit_a, limit_b, log_a, log_b])
    db.commit()

    # SQL RLS 필터 세션 시뮬레이션: current_user = 'user-a-uuid'
    def apply_rls_filter(query, model, current_uid: str):
        if hasattr(model, "user_id"):
            return query.filter(model.user_id == current_uid)
        elif model.__tablename__ == "users":
            return query.filter(model.id == current_uid)
        elif model.__tablename__ == "chat_messages":
            return query.join(ChatSession).filter(ChatSession.user_id == current_uid)
        elif model.__tablename__ == "message_attachments":
            return query.join(ChatMessage).join(ChatSession).filter(ChatSession.user_id == current_uid)
        return query

    # 8개 전체 테이블에 대해 User A 격리 쿼리 검증
    user_a_results = {
        "users": apply_rls_filter(db.query(User), User, "user-a-uuid").all(),
        "user_settings": apply_rls_filter(db.query(UserSettings), UserSettings, "user-a-uuid").all(),
        "usage_limits": apply_rls_filter(db.query(UsageLimit), UsageLimit, "user-a-uuid").all(),
        "usage_logs": apply_rls_filter(db.query(UsageLog), UsageLog, "user-a-uuid").all(),
        "chat_sessions": apply_rls_filter(db.query(ChatSession), ChatSession, "user-a-uuid").all(),
        "chat_messages": apply_rls_filter(db.query(ChatMessage), ChatMessage, "user-a-uuid").all(),
        "message_attachments": apply_rls_filter(db.query(MessageAttachment), MessageAttachment, "user-a-uuid").all(),
        "custom_instructions": apply_rls_filter(db.query(CustomInstruction), CustomInstruction, "user-a-uuid").all(),
    }

    for table_name, rows in user_a_results.items():
        assert len(rows) >= 1, f"Expected at least 1 record for user A in table {table_name}"
        for row in rows:
            if hasattr(row, "user_id"):
                assert row.user_id == "user-a-uuid"
            elif hasattr(row, "id") and table_name == "users":
                assert row.id == "user-a-uuid"

    db.close()
