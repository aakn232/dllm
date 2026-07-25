# 🚀 Project Onboarding Guide (프로젝트 온보딩 가이드)

DLLM 프로젝트에 오신 것을 환영합니다! 이 가이드는 새로운 팀원이 빠르게 코드베이스 구조, 주요 레이어, 핵심 패턴 및 주의해야 할 컴포넌트를 파악할 수 있도록 돕기 위해 작성되었습니다.

---

## 1. 프로젝트 개요 (Project Overview)

- **프로젝트 이름**: DLLM (Dynamic LLM Web Application)
- **주요 언어**: Python, TypeScript, SQL, HTML/CSS
- **프레임워크 및 기술 스택**:
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS / Vanilla CSS (`frontend/`)
  - **Backend**: FastAPI, Python 3.13, Pytest (`backend/`)
  - **Database & Auth**: Supabase Postgres, RLS (Row Level Security), Supabase Auth
  - **Deployment**: Vercel (`dllm_frontend` 및 `dllm_backend`)
- **설명**: FastAPI 백엔드와 React 프론트엔드로 구성된 LLM 지원 웹 애플리케이션으로, RLS 기반 데이터 보안 및 Vercel 서버리스 배포 환경을 지원합니다.

---

## 2. 아키텍처 레이어 (Architecture Layers)

코드베이스는 역할과 책임에 따라 크게 다음과 같은 레이어로 구분됩니다.

### 🏢 1) Backend Layer (`backend/`)
- **역할**: API 요청 처리, 세션 관리, RLS 보안 검증, 관리자 기능 제공
- **주요 디렉토리 및 파일**:
  - `backend/main.py`: FastAPI 애플리케이션 진입점 및 라우터 마운트
  - `backend/routers/`: API 엔드포인트 라우터 (`admin.py`, `chat.py`, `sessions.py`, `auth.py`, `system.py` 등)
  - `backend/config.py`: 환경변수 및 기본 구성 설정
  - `backend/db.py`: Supabase 및 DB 클라이언트 연동
  - `backend/middleware/`: 인증 및 보안 미들웨어 (`auth.py`, `rate_limit.py`, `security_headers.py`)

### 🎨 2) Frontend Layer (`frontend/`)
- **역할**: 사용자 인터페이스, 사용자 경험(UX), API 연동 및 상태 관리
- **주요 디렉토리 및 파일**:
  - `frontend/src/main.tsx` & `frontend/src/App.tsx`: 프론트엔드 진입점 및 메인 컴포넌트
  - `frontend/src/components/`: 모달, 사이드바, 상태 대시보드 등 UI 컴포넌트 (`Sidebar.tsx`, `CustomInstructionsModal.tsx`, `StatusDashboard.tsx` 등)
  - `frontend/src/context/` & `frontend/src/hooks/`: 인증 및 전역 상태 관리 (`AuthContext.tsx`, `useChat.ts` 등)
  - `frontend/src/services/`: 백엔드 통신 API 클라이언트 모듈

### 🔒 3) Database & Security Layer (Supabase Postgres)
- **역할**: RLS(Row Level Security) 정책을 통한 사용자 데이터 접근 제어 및 데이터 격리
- **주요 가이던스 및 검증**:
  - `backend/tests/test_rls_security.py`: RLS 보안 및 유저 간 권한 격리 자동 테스트

---

## 3. 핵심 디자인 패턴 및 가이드라인 (Key Concepts & Rules)

- **RLS 기반 보안 (Row Level Security)**: DB 레벨에서 모든 쿼리가 사용자의 UID를 기준으로 필터링되도록 보장합니다.
- **서버 배포 규칙 (`.agents/rules/server-list.md`)**:
  1. Frontend: Vercel `dllm_frontend`
  2. Backend: Vercel `dllm_backend`
  3. DB: Supabase
- **배포 및 지속 가능성 (`.agents/rules/future.md`)**: 불특정 다수의 사용자가 사용하는 웹사이트 배포를 염두에 두고 개발합니다.

---

## 4. 가이드 투어 (Guided Learning Tour)

신규 개발자는 다음 순서로 코드베이스를 탐색하는 것을 권장합니다.

1. **[설정 및 가이드라인 확인]**
   - `.agents/rules/server-list.md` 및 `pyproject.toml` / `frontend/package.json` 파악
2. **[백엔드 진입점 및 엔드포인트]**
   - `backend/main.py` ➔ 라우터 연결 구조 확인
   - `backend/routers/chat.py` 및 `backend/routers/sessions.py` ➔ 핵심 비즈니스 로직 탐색
3. **[프론트엔드 UI 및 상태 관리]**
   - `frontend/src/App.tsx` ➔ 레이아웃 및 뷰 구조 파악
   - `frontend/src/components/Sidebar.tsx` 및 `frontend/src/context/` ➔ 세션 선택 및 상태 로직 확인
4. **[보안 및 테스트 코드]**
   - `backend/tests/test_rls_security.py` ➔ RLS 보안 검증 방식 이해

---

## 5. 주의가 필요한 복잡도 핫스팟 (Complexity Hotspots)

다음 파일들은 로직이 밀집되어 있거나 변경 시 주의가 필요한 핵심 컴포넌트입니다.

| 파일 경로 | 핫스팟 이유 |
|---|---|
| `backend/routers/chat.py` | LLM 대화 스트리밍, 대화 이력 저장 및 세션 연동 로직 포함 |
| `backend/routers/admin.py` | 관리자 권한 검증 및 전체 시스템 상태 조회/조작 |
| `backend/tests/test_rls_security.py` | Supabase RLS 정책 및 사용자 간 데이터 격리 보안 검증 |
| `frontend/src/App.tsx` | 전체 프론트엔드 뷰 상태, 대시보드 및 모달 오버레이 통합 |
| `frontend/src/components/Sidebar.tsx` | 대화 세션 목록, 검색, 삭제, 모달 트리거 관리 |

---

## 6. 개발 및 실행 방법 (Quick Start)

### 백엔드 실행
```bash
# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 실행 (FastAPI / Uvicorn)
uvicorn backend.main:app --reload
```

### 프론트엔드 실행
```bash
cd frontend
npm run dev
```
