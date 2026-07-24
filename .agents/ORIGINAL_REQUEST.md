# Original User Request

## 2026-07-24T18:18:54Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

현재 구축된 DLLM 프로젝트(React+Vite 프론트엔드 및 FastAPI 백엔드)의 전반적인 완성도를 높이기 위해, 백엔드의 DB 커넥션 안정성 및 RLS 보안을 강화하고 프론트엔드의 에러 핸들링 및 UX/UI를 개선합니다.

Working directory: c:\Users\waati\OneDrive\바탕 화면\dev\dllm
Integrity mode: development

## Requirements

### R1. 백엔드 안정성 및 성능 최적화
데이터베이스 커넥션 관리를 개선하여 동시 접속에 대비하고, 데이터 보호를 위해 Supabase RLS(Row Level Security) 보안 정책을 수립한다.

### R2. 프론트엔드 UX/UI 개선 및 에러 핸들링
애플리케이션 전반에 에러 바운더리(Error Boundary)를 설정하여 장애를 격리하고, 네트워크 지연 시 스켈레톤 로딩 노출 및 마이크로 애니메이션을 도입하여 사용자 경험을 향상시킨다.

## Acceptance Criteria

### 백엔드 검증 (R1)
- [ ] `backend/tests`에 작성된 자동화된 부하 테스트 스크립트를 실행했을 때, 최소 50개의 동시 요청 환경에서 `Too many connections` 등의 DB 커넥션 고갈 오류 없이 스크립트가 통과해야 한다.
- [ ] 권한이 없는 사용자나 타 사용자의 데이터에 접근을 시도하는 보안 검증 스크립트 실행 시, Supabase RLS 정책에 의해 접근이 차단됨을 테스트 결과로 증명해야 한다.

### 프론트엔드 검증 (R2)
- [ ] E2E 자동화 테스트(예: Playwright) 스크립트를 통해 의도적으로 렌더링 에러를 발생시켰을 때, 전체 화면이 멈추지 않고 적절한 Fallback UI(에러 바운더리)가 노출됨을 테스트 통과로 증명해야 한다.
- [ ] API 응답 지연을 모의(Mocking)한 E2E 테스트 환경에서 로딩 스켈레톤 UI가 화면에 렌더링됨을 테스트가 확인해야 한다.
</USER_REQUEST>
