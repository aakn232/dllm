# DLLM 백엔드 DB 커넥션 풀 및 RLS 보안 종합 분석 보고서

## 1. 개요 (Executive Summary)

본 보고서는 `DLLM` 백엔드 시스템(`c:\Users\waati\OneDrive\바탕 화면\dev\dllm\backend`)의 **데이터베이스 커넥션 관리 구조, 50+ 동시 요청 시 발생 가능한 병목 지점, 가상환경 기반 테스트 체계, Supabase 테이블 및 RLS(Row Level Security) 보안 정책 설계**를 종합 분석하고, 이에 따른 실행 가능한 최적화 가이드 및 자동화 테스트 스크립트 설계를 제시합니다.

---

## 2. 현 백엔드 데이터베이스 커넥션 구조 분석

### 2.1 DB 드라이버 및 엔진 설정 (`backend/config.py`, `backend/database.py`)
- **DB URL 및 드라이버**: `.env` 파일의 `DATABASE_URL`(`postgresql://...:5432/postgres`)을 읽어 동기식 PostgreSQL 드라이버인 `psycopg2`(`postgresql+psycopg2://`)로 자동 변환하여 사용합니다.
- **SQLAlchemy 엔진 커넥션 풀 설정**:
  ```python
  engine_kwargs["pool_size"] = 20
  engine_kwargs["max_overflow"] = 30
  engine_kwargs["pool_recycle"] = 300
  engine_kwargs["pool_pre_ping"] = True
  engine_kwargs["connect_args"] = {
      "keepalives": 1,
      "keepalives_idle": 30,
      "keepalives_interval": 10,
      "keepalives_count": 5
  }
  ```
- **최대 동시 커넥션 한도**: SQLAlchemy QueuePool의 `pool_size(20) + max_overflow(30) = 50개`입니다.
- **세션 생성 방식**: FastAPI 의존성 `get_db()`를 통하여 요청마다 `SessionLocal()`을 생성(`yield db`)하고, 요청 종료 후 `db.close()`로 세션을 수거합니다.

---

## 3. 50+ 동시 요청 시 커넥션 고갈(Exhaustion) 병목 요인 분석

### 3.1 [핵심 병목] AI SSE 스트리밍 도중 DB 커넥션 점유 (Critical Bottleneck)
- **발생 위치**: `backend/routers/chat.py` 내 `chat_completions` 엔드포인트
- **원인 메커니즘**:
  1. `chat_completions` 함수는 `db: Session = Depends(get_db)`를 통해 DB 세션을 주입받습니다.
  2. NVIDIA NIM API 통신 및 SSE 스트리밍을 처리하기 위해 `StreamingResponse(stream_nvidia_response(..., db, ...))`를 반환합니다.
  3. FastAPI의 제너레이터 의존성(`get_db`) 구조상, 반환된 `StreamingResponse`가 완료(스트리밍 종료)될 때까지 `get_db()`의 `finally: db.close()` 구문이 실행되지 않고 대기합니다.
  4. 하나의 AI 대화 스트리밍 응답이 완료되기까지 **10초~60초**가 소요되는 동안, 해당 요청은 **SQLAlchemy 커넥션 1개를 계속 독점(Hold)**하게 됩니다.
- **50+ 동시 요청 장애 시나리오**:
  - 50명의 사용자가 동시에 Chat 요청을 보낼 경우, 50개의 모든 커넥션(`pool_size` 20 + `max_overflow` 30)이 즉시 고갈됩니다.
  - 51번째 동시 요청이 들어오면 커넥션 풀 대기 상태(`pool_timeout` 기본 30초)에 진입하며, 30초 후 `sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 30 reached, connection timed out` 에러와 함께 HTTP 500 응답이 발생합니다.
  - 대화 생성이 진행되는 동안 다른 단순 조회(세션 목록 조회, 유저 설정 조회, status 확인 등) 요청까지 모두 커넥션을 얻지 못하고 대기 상태에 빠지는 **전체 백엔드 마비 현상**이 초래됩니다.

### 3.2 `async def` 엔드포인트 내 동기식 SQLAlchemy/psycopg2 호출에 의한 Event Loop 블로킹
- `chat_completions` 엔드포인트는 `async def`로 선언되어 있지만, 내부에서 동기식 `db.query(UsageLimit)`, `db.query(ChatSession)`, `db.query(CustomInstruction)` 구문을 직접 실행합니다.
- Python의 단일 쓰레드 `asyncio` 이벤트 루프 위에서 동기 I/O(psycopg2)를 직접 수행하므로, DB 응답 속도에 따라 이벤트 루프가 일시적으로 멈추어 전체 아키텍처의 동시 처리 성능이 급격히 저하됩니다.

### 3.3 요청별 `httpx.AsyncClient` 객체 매번 생성
- `routers/chat.py` 365행: `client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0))`
- 요청이 들어올 때마다 새로운 HTTP 커넥션 클라이언트를 생성하고 닫으므로 SSL/TLS 핸드셰이크 overhead 및 소켓 리소스 낭비가 발생합니다.

### 3.4 Supabase 포트 5432 (Session Mode) 사용
- `.env`에 정의된 `aws-1-ap-south-1.pooler.supabase.com:5432`는 Supabase의 Session Mode 풀러입니다.
- Session Mode는 백엔드의 1개 커넥션을 Supabase PostgreSQL 서버의 1개 Dedicated Process로 매핑하므로 Supabase Server의 max_connections 한도에 쉽게 도달합니다.
- Supavisor / PgBouncer의 Transaction Mode인 **포트 6543**을 사용하는 것이 다량의 커넥션을 효율적으로 멀티플렉싱하는 데 훨씬 유리합니다.

---

## 4. 커넥션 풀 최적화 실행 방안 (Actionable Recommendations)

1. **스트리밍 시작 전 DB 세션 명시적 조기 반납 (Early DB Release Pattern)**:
   - Chat 엔드포인트 검증(한도 확인, 세션 유효성 검사, 맞춤지침 조회)을 마친 후 스트리밍 응답을 생성하기 직전에 `db.close()`를 수행하여 커넥션을 풀에 즉시 반납합니다.
   - 스트리밍 종료 시(`[DONE]`) 메시지 저장 및 사용량 기록은 별도의 짧은 단일 DB 세션(`SessionLocal()`)을 새로 열어 저장한 후 지체 없이 `close()`합니다.
2. **글로벌 `httpx.AsyncClient` 싱글톤 커넥션 재사용**:
   - FastAPI lifespan 또는 `app.on_event("startup")`에서 단일 `httpx.AsyncClient` 객체를 생성하여 라우터 간에 공유함으로써 커넥션 재사용성을 높입니다.
3. **Supabase Transaction Pooler (Port 6543) 전환**:
   - production 환경의 `DATABASE_URL`을 포트 6543으로 설정하여 트랜잭션 단위 수천 개 요청 수용 방식을 채택합니다.
4. **FastAPI 엔드포인트 선언 방식 정돈**:
   - 동기식 psycopg2 및 SQLAlchemy를 사용하는 조회 라우터는 `def`로 정의하거나(Starlette 쓰레드풀 활용), 향후 `asyncpg` + AsyncSession으로 전환을 권장합니다.

---

## 5. 부하 테스트 스크립트 설계 (`backend/tests/test_load.py`)

### 5.1 테스트 목표
- 50개 이상의 동시 요청(Concurrent Requests)이 수행될 때, DB 커넥션 풀 고갈 타임아웃 에러 없이 100% 성공(RPS 및 Latency 측정)하는지 검증.

### 5.2 부하 테스트 스크립트 구조
```python
import pytest
import asyncio
import httpx
import time

BASE_URL = "http://127.0.0.1:8000"
CONCURRENT_USERS = 50

@pytest.mark.asyncio
async def test_backend_concurrent_load():
    """
    50명 이상의 동시 사용자가 동시에 인증 및 세션 조회/상태 확인 요청을 보낼 때
    DB 커넥션 풀 타임아웃 및 병목 현상이 발생하지 않는지 검증하는 동시성 부하 테스트
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. 헬스체크 및 Status 엔드포인트 50개 동시 요청
        async def fetch_status(user_idx: int):
            start = time.time()
            response = await client.get(f"{BASE_URL}/api/v1/status")
            elapsed = time.time() - start
            return response.status_code, elapsed

        tasks = [fetch_status(i) for i in range(CONCURRENT_USERS)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        success_count = sum(1 for r in results if isinstance(r, tuple) and r[0] == 200)
        assert success_count == CONCURRENT_USERS, f"Expected {CONCURRENT_USERS} successful requests, got {success_count}"
```

---

## 6. Supabase 테이블 및 RLS(Row Level Security) 보안 정책 설계

### 6.1 현 백엔드 DB 모델 테이블 목록
1. `users` (사용자 계정 정보)
2. `user_settings` (사용자 개인 설정)
3. `usage_limits` (일일 토큰/요청 한도)
4. `usage_logs` (일자별 토큰/요청 사용 로그)
5. `chat_sessions` (대화 세션 목록)
6. `chat_messages` (대화 메시지 내용)
7. `message_attachments` (메시지 첨부파일)
8. `custom_instructions` (사용자 맞춤 지침)

### 6.2 SQL RLS 정책 정의 (Supabase Migration SQL)
```sql
-- 1. 모든 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_instructions ENABLE ROW LEVEL SECURITY;

-- 2. chat_sessions RLS 정책: 본인 세션만 접근 가능
CREATE POLICY "Users can manage own sessions" ON chat_sessions
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 3. chat_messages RLS 정책: 본인 세션에 속한 메시지만 접근 가능
CREATE POLICY "Users can manage messages in own sessions" ON chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()::text
        )
    );

-- 4. custom_instructions RLS 정책
CREATE POLICY "Users can manage own custom instructions" ON custom_instructions
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 5. user_settings RLS 정책
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
```

### 6.3 자동화 보안 검증 테스트 스크립트 설계 (`backend/tests/test_rls_security.py`)
- **검증 항목**:
  1. 미인증 사용자의 세션 및 메시지 접근 시도 시 차단 검증
  2. A 사용자의 JWT 토큰으로 B 사용자의 `chat_sessions`, `chat_messages`, `custom_instructions` 조작/조회 시도 시 404/403/Empty Response 차단 검증
  3. 일반 사용자의 관리자 전용 API(`/api/v1/admin/*`) 접근 시도 시 403 Forbidden 차단 검증
  4. 관리자 계정의 정상 관리 권한 수행 검증

---

## 7. 결론 및 향후 구현 과제 (Conclusion & Next Steps)

1. **커넥션 풀 리팩토링 (M1)**: `chat.py` 스트리밍 시 DB 조기 반납 패턴 적용 및 `httpx.AsyncClient` 싱글톤 도입.
2. **동시성 부하 테스트 구현 (M1)**: `backend/tests/test_load.py` 작성 및 50 동시 요청 통과 검증.
3. **RLS 마이그레이션 및 자동화 보안 테스트 (M2)**: Supabase RLS SQL 파일 및 `backend/tests/test_rls_security.py` 작성.
