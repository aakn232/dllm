import os
import pytest
import asyncio
import httpx
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from backend.main import app
from backend.database import Base, get_db, SessionLocal
from backend.models import User, UserSettings, ChatSession, CustomInstruction
from backend.dependencies import get_current_user
from backend.config import SECRET_KEY, ALGORITHM
from jose import jwt

TEST_DB_FILE = "./test_load_concurrency.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch):
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("backend.database.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("backend.routers.chat.SessionLocal", TestingSessionLocal)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 기본 테스트 유저 생성
    db = TestingSessionLocal()
    user = User(
        id="test-load-user-id",
        username="loaduser",
        email="loaduser@example.com",
        hashed_password="hashed_password",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()
    
    yield
    
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

def create_auth_header(user_id: str = "test-load-user-id") -> dict:
    payload = {"sub": user_id}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

def test_50_concurrent_status_requests():
    """
    50개 이상의 동시 요청(60개)이 /api/v1/status 엔드포인트로 들어올 때
    DB 커넥션 고갈이나 타임아웃 없이 100% 성공(200 OK)하는지 검증
    """
    async def _run():
        CONCURRENT_COUNT = 60
        transport = httpx.ASGITransport(app=app)
        
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            async def fetch_status(idx: int):
                res = await client.get("/api/v1/status")
                return res.status_code

            tasks = [fetch_status(i) for i in range(CONCURRENT_COUNT)]
            results = await asyncio.gather(*tasks, return_exceptions=False)

        success_count = sum(1 for status_code in results if status_code == 200)
        assert success_count == CONCURRENT_COUNT, f"Expected {CONCURRENT_COUNT} successful requests, got {success_count}"

    asyncio.run(_run())

def test_50_concurrent_authenticated_requests():
    """
    50개 이상의 동시 요청(60개)이 인증된 사용자 데이터 조회(/api/v1/sessions, /api/v1/settings 등)로
    들어올 때 커넥션 풀 고갈 없이 정상 처리되는지 검증
    """
    async def _run():
        CONCURRENT_COUNT = 60
        headers = create_auth_header()
        transport = httpx.ASGITransport(app=app)

        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            async def fetch_sessions(idx: int):
                res = await client.get("/api/v1/sessions", headers=headers)
                return res.status_code

            tasks = [fetch_sessions(i) for i in range(CONCURRENT_COUNT)]
            results = await asyncio.gather(*tasks, return_exceptions=False)

        success_count = sum(1 for status_code in results if status_code == 200)
        assert success_count == CONCURRENT_COUNT, f"Expected {CONCURRENT_COUNT} successful requests, got {success_count}"

    asyncio.run(_run())

def test_50_concurrent_chat_completion_early_release(monkeypatch):
    """
    50개 이상의 동시 Chat Completion 요청 시 Early Release Pattern으로 인해
    스트리밍 진입 전에 DB 커넥션이 즉시 반납되어 커넥션 풀 고갈이 발생하지 않음을 검증
    """
    async def _run():
        CONCURRENT_COUNT = 55
        headers = create_auth_header()

        # NVIDIA API 호출 모킹 (스트리밍 SSE 응답 생성)
        class DummyStreamResponse:
            def __init__(self):
                self.status_code = 200

            async def aiter_lines(self):
                yield 'data: {"choices": [{"delta": {"content": "Hello, world!"}}]}'
                yield 'data: [DONE]'

            async def aclose(self):
                pass

        class DummyHttpClient:
            def build_request(self, method, url, headers=None, json=None):
                return None

            async def send(self, request, stream=True):
                return DummyStreamResponse()

        monkeypatch.setattr("backend.routers.chat.get_async_client", lambda: DummyHttpClient())

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            async def post_chat(idx: int):
                payload = {
                    "messages": [{"role": "user", "content": "Load test prompt"}],
                    "enable_thinking": False
                }
                res = await client.post("/api/v1/chat/completions", json=payload, headers=headers)
                return res.status_code, res.text

            tasks = [post_chat(i) for i in range(CONCURRENT_COUNT)]
            results = await asyncio.gather(*tasks, return_exceptions=False)

        success_count = sum(1 for status_code, text in results if status_code == 200 and "[DONE]" in text)
        assert success_count == CONCURRENT_COUNT, f"Expected {CONCURRENT_COUNT} successful chat requests, got {success_count}"

    asyncio.run(_run())
