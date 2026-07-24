# Handoff Report — DLLM Backend DB Connection Pool & RLS Assessment

## 1. Observation (직접 관찰 내용)

1. **DB 연결 및 커넥션 풀 설정 (`backend/config.py:10-14`, `backend/database.py:6-21`)**:
   - `DATABASE_URL`을 동기식 `psycopg2` 드라이버(`postgresql+psycopg2://`)로 변환하여 사용.
   - `database.py` 10~13행: `pool_size = 20`, `max_overflow = 30`, `pool_recycle = 300`, `pool_pre_ping = True`. (최대 50개 커넥션)
   - `.env` 4행: `DATABASE_URL=postgresql://postgres.skeijofwmacamwiqppfz:lyWevZdJL7yYF1Bj@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` (Supabase Session Pooler 포트 5432 사용).

2. **AI 스트리밍 엔드포인트 DB 점유 메커니즘 (`backend/routers/chat.py:293-384`)**:
   - 294행: `async def chat_completions(req: ChatCompletionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user))`
   - 365행: 요청마다 `client = httpx.AsyncClient(...)` 개별 생성.
   - 380-383행: `StreamingResponse(stream_nvidia_response(response, req.enable_thinking, req.session_id, db, current_user.id), media_type="text/event-stream")`
   - `get_db()` 제너레이터 의존성은 `StreamingResponse`가 완료(최장 30~60초)될 때까지 `yield` 상태를 유지하여 DB 커넥션을 점유함.
   - 스트림 완료 후 `[DONE]` 시점(173-214행)에 `db.add(msg)`, `db.commit()`, `db.query(UsageLog)` 등 DB 작업을 수행함.

3. **테스트 환경 및 실행 결과 (`backend/tests`)**:
   - 테스트 커맨드: `& "c:\Users\waati\OneDrive\바탕 화면\dev\dllm\venv\Scripts\python.exe" -m pytest backend/tests`
   - 테스트 결과: `20 passed, 45 warnings in 7.08s` (4개 테스트 파일 모두 통과).
   - 테스트 환경: `c:\Users\waati\OneDrive\바탕 화면\dev\dllm\venv` 가상환경 내 Python 3.13.9, pytest-9.1.1.

4. **Supabase 테이블 및 RLS 현황**:
   - DB 테이블 8개 정의됨: `users`, `user_settings`, `usage_limits`, `usage_logs`, `chat_sessions`, `chat_messages`, `message_attachments`, `custom_instructions` (`backend/models.py`).
   - 현재 백엔드는 `postgres` 슈퍼유저 계정으로 접속하므로 RLS가 기본 바이패스됨. 별도의 RLS SQL 마이그레이션 파일 및 `test_rls_security.py` 스크립트는 아직 미작성 상태임.

---

## 2. Logic Chain (논리 체인)

1. **관찰 1, 2에 근거**: `chat_completions` 엔드포인트는 `get_db()`를 통해 DB 커넥션을 획득한 후 `StreamingResponse`를 반환함. FastAPI의 스펙에 따라 SSE 스트리밍이 진행되는 동안(10~60초) `get_db()`의 `finally: db.close()`가 불리지 않으므로 DB 커넥션 1개가 락킹 상태로 유지됨.
2. **관찰 1에 근거**: SQLAlchemy의 동시 최대 커넥션 수(pool_size 20 + max_overflow 30)는 50개임.
3. **추론**: 50개 이상의 동시 요청이 발생할 경우, 50개의 모든 커넥션이 AI 스트리밍 도중 점유되어 커넥션 풀이 완전히 고갈됨. 51번째 요청부터는 커넥션 획득 대기 상태에 빠지며 `pool_timeout`(30초) 후 `QueuePool limit of size 20 overflow 30 reached` 에러 발생.
4. **관찰 3에 근거**: 기존 테스트 패키지는 In-Memory SQLite를 사용하여 API 로직 기본 동작만 확인하며, 동시성 부하 테스트(`test_load.py`) 및 RLS 보안 테스트(`test_rls_security.py`)는 구성되어 있지 않음.
5. **결론에 도달**: DB 커넥션 조기 반납(Early Release) 패턴 적용, 싱글톤 HTTP 클라이언트 전환, Supabase Transaction Pooler(Port 6543) 활용, 부하 및 RLS 보안 자동화 테스트 작성이 필요함.

---

## 3. Caveats (주의사항 및 미조사 영역)

- 현재 실제 NVIDIA API 키에 부하를 직접 가하는 부하 테스트는 API 할당량 소진을 방지하기 위해 모킹 또는 로컬 스텁 상태로 검증하는 것을 권장합니다.
- Supabase Cloud 서비스의 실제 RLS 활성화 작업은 Supabase Dashboard 또는 SQL Editor/CLI 마이그레이션을 통해 적용되어야 합니다.

---

## 4. Conclusion (최종 판단 및 권고사항)

1. **DB 커넥션 조기 반납 (Early DB Release)**: `chat.py`에서 파라미터 검증 완료 후 `StreamingResponse`를 리턴하기 전에 `db.close()`를 실행하고, 스트리밍 완료(`[DONE]`) 시에는 짧은 독립 세션을 열어 DB 저장을 처리하도록 수정.
2. **단일 AsyncClient 싱글톤 패턴 도입**: `routers/chat.py`에서 매번 `httpx.AsyncClient`를 생성하는 대신 FastAPI Lifespan 이벤트에서 생성한 단일 클라이언트 공유.
3. **부하 테스트 스크립트 작성 (`backend/tests/test_load.py`)**: `asyncio`와 `httpx`를 이용해 50개 동시 요청 시 타임아웃 없는 정상 처리 검증.
4. **Supabase RLS 보안 스크립트 작성 (`backend/tests/test_rls_security.py`)**: 8개 테이블 대상 RLS 정책 및 타 사용자 데이터 접근 차단 테스트 작성.

---

## 5. Verification Method (검증 방법)

1. **기존 테스트 수행 확인**:
   ```powershell
   & "c:\Users\waati\OneDrive\바탕 화면\dev\dllm\venv\Scripts\python.exe" -m pytest backend/tests
   ```
2. **분석 보고서 검토**:
   - `c:\Users\waati\OneDrive\바탕 화면\dev\dllm\.agents\explorer_backend\analysis.md` 파일 존재 및 내용 검증.
3. **무효화 조건 (Invalidation Conditions)**:
   - FastAPI가 스트리밍 도중 DB 커넥션을 반납하도록 `db.close()`를 호출하지 않은 상태에서 동시 요청 부하 테스트 시 `QueuePool` 타임아웃 에러가 0건이 아닐 경우 분석 수정 필요.
