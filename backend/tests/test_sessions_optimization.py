import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, Base, engine
from backend.models import User
from backend.dependencies import get_current_user

client = TestClient(app)
TEST_USER_ID = "test-user-id-opt"

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    user = db.query(User).filter(User.id == TEST_USER_ID).first()
    if not user:
        user = User(id=TEST_USER_ID, username="optuser", email="opt@example.com", hashed_password="pw")
        db.add(user)
        db.commit()
    yield

def mock_get_current_user():
    return User(id=TEST_USER_ID, username="optuser", email="opt@example.com", hashed_password="pw")

app.dependency_overrides[get_current_user] = mock_get_current_user

def test_session_summary_and_detail_flow():
    # 1. API를 통해 세션 생성
    create_res = client.post("/api/v1/sessions", json={"title": "최적화 테스트 세션"})
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 2. 메시지 생성
    msg_res = client.post(f"/api/v1/sessions/{session_id}/messages", json={
        "role": "user",
        "content": "안녕하세요 최적화 테스트입니다"
    })
    assert msg_res.status_code == 200

    # 3. GET /sessions (목록 경량 조회 검증)
    list_res = client.get("/api/v1/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    target_session = next((s for s in sessions if s["id"] == session_id), None)
    assert target_session is not None
    assert "messages" not in target_session  # 경량화 검증: messages 포함 안 됨

    # 4. GET /sessions/{session_id} (단일 세션 상세 조회 검증)
    detail_res = client.get(f"/api/v1/sessions/{session_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == session_id
    assert "messages" in detail
    assert len(detail["messages"]) == 1
    assert detail["messages"][0]["content"] == "안녕하세요 최적화 테스트입니다"
