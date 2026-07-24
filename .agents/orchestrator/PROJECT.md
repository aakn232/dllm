# Project: DLLM Optimization & Resilience

## Architecture
- **Backend**: FastAPI with Supabase Python client / async HTTP client / SQLAlchemy or direct Supabase connection. Located in `backend/`.
- **Frontend**: React + Vite application. Located in `frontend/`.
- **Database**: Supabase PostgreSQL + Auth + RLS.
- **Testing**: Pytest for backend unit/load/security tests (`backend/tests/`), Playwright for frontend E2E tests (`frontend/e2e/` or `frontend/tests/`).

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: DB Connection Management | Connection pooling/management in FastAPI/Supabase, load test script under `backend/tests` (>= 50 concurrent requests) | None | DONE |
| 2 | M2: Supabase RLS Security Policies | Supabase RLS policies and automated security test script proving unauthorized/cross-user block | M1 | DONE |
| 3 | M3: Frontend Error Boundary & Fallback UI | React Error Boundary component, fallback UI, Playwright E2E test for intentional rendering error | None | DONE |
| 4 | M4: Skeleton Loading UI & Micro-animations | Skeleton loading UI, micro-animations, Playwright E2E test mocking API latency | M3 | DONE |

## Interface Contracts
- Backend API endpoints return standard HTTP error codes (401, 403, 500, etc.) and json response format.
- Frontend components handle network latency gracefully using loading skeletons and catch uncaught JS errors via ErrorBoundary.

## Code Layout
- `backend/app`: FastAPI application endpoints, database client, connection pool setup.
- `backend/tests`: Test scripts (`test_load.py`, `test_rls_security.py`).
- `frontend/src`: React application components (`components/ErrorBoundary.jsx`, `components/Skeleton.jsx`, etc.).
- `frontend/e2e` or `frontend/tests`: Playwright tests (`error-boundary.spec.js`, `skeleton-loading.spec.js`).
