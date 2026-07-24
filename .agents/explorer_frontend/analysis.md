# DLLM 프론트엔드 코드베이스 분석 및 개선 권장사항 보고서

**작성자**: teamwork_preview_explorer (Frontend Explorer Agent)  
**일시**: 2026-07-25  
**대상 경로**: `c:\Users\waati\OneDrive\바탕 화면\dev\dllm\frontend`  

---

## 1. 프론트엔드 코드베이스 종합 아키텍처 분석

### 1.1 기본 스택 및 빌드 환경
- **빌드 도구 & 라이브러리**: Vite v8.1.1, React v18.3.1, TypeScript v6.0.2
- **스타일링**: TailwindCSS v3.4.19 / PostCSS (`@tailwindcss/postcss`, `autoprefixer`)
- **코드 린팅**: Oxlint (`oxlint` v1.71.0)
- **배포 타겟**: Vercel (`dllm_frontend`)

### 1.2 라우팅 및 상태 관리 구조
- **라우터**: `react-router-dom` v7.18.1
  - `src/main.tsx`: `<BrowserRouter>` 진입점
  - `src/App.tsx`: `<Routes>`, `<Route path="/" element={<ChatView />} />`, `<Route path="/c/:sessionId" element={<ChatView />} />`
- **상태 관리**: Zustand v5.0.14
  - `useAuthStore` (`src/store/useAuthStore.ts`): 사용자 인증 token, 로그인/회원가입, 비밀번호 변경, 사용자 설정 동기화
  - `useChatStore` (`src/store/useChatStore.ts`): 대화 세션 목록, 현재 세션 메시지, SSE 실시간 스트림 (`sendMessage`, `editAndResendMessage`), TPS 측정, 다크모드, 씽킹 모드
  - `useSettingsStore` (`src/store/useSettingsStore.ts`): 커스텀 맞춤지침 설정
- **API 및 에러 유틸리티**:
  - `src/utils/apiClient.ts`: `authFetch` 래퍼 (Bearer 토큰 자동 첨부, 401 응답 시 로그아웃)
  - `src/utils/errorUtils.ts`: `extractErrorMessage` (FastAPI / Pydantic validation error JSON을 문자열 메시지로 변환)

---

## 2. 현행 에러 처리 및 Error Boundary 상태 분석

### 2.1 현행 에러 처리 방식
- `apiClient.ts`의 `authFetch`: HTTP 401 만료 시 자동 로그아웃.
- `useChatStore.ts`: SSE 응답 파싱 중 오류 발생 시 메시지 텍스트에 `⚠️ 오류 발생: [err.message]` 형태로 덧붙임.
- `useAuthStore.ts`: `handleFetchError`에서 네트워크 오프라인 또는 CORS 실패 시 에러 래핑.

### 2.2 문제점 (Error Boundary 부재)
- **전역/부분 React Error Boundary 미구현**:
  - `ChatMessageItem.tsx`, `MarkdownRenderer.tsx` (rehype-katex, prismjs), `ThinkingBlock.tsx` 등 컴포넌트 렌더링 중 예외(Syntax Error, undefined property 접근, DOM 파싱 에러) 발생 시 **전체 React 컴포넌트 트리가 렌더링을 중단하고 하얀 화면(White Screen of Death)**으로 멈춤.
  - 사용자는 오류의 원인을 알 수 없으며, 앱 전체가 멈추어 복구(다시 시도)를 할 수 없음.

---

## 3. 현행 로딩 상태 표시 (Loading State Indicators) 분석

### 3.1 현행 로딩 표기 방식
- `App.tsx` Line 102-113: 최초 인증 체크 시 중앙 원형 스피너 (`animate-spin`).
- `App.tsx` Line 195-199: 세션 전환/로딩 시 중앙 원형 스피너 (`isLoadingSession`).
- `ChatMessageItem.tsx`: AI 답변 스트리밍 시 TPS 게이지 아이콘 및 `animate-pulse` 초록 점 표시.

### 3.2 문제점 (스켈레톤 UI 부재)
- 대화 내역(`messages`)이나 사이드바 세션 목록(`sessions`)을 불러올 때 화면 전체가 비어 있거나 스피너 하나만 표시되어 **누적 레이아웃 이동(CLS, Cumulative Layout Shift)**이 발생함.
- 사용자 체감 대기 시간(Perceived Latency)이 길어짐.

---

## 4. E2E 테스트 프레임워크 (Playwright) 상태 및 윈도우 환경 실행 가이드

### 4.1 현행 상태
- `package.json` 검토 결과 `@playwright/test` 및 관련 패키지 **미설치**.
- `playwright.config.ts` 및 `frontend/e2e/` 디렉터리 **부재**.

### 4.2 Playwright 설치 및 윈도우 환경 실행 절차
1. **패키지 설치**:
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```
2. **설정 파일 생성 (`frontend/playwright.config.ts`)**:
   ```typescript
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     use: {
       baseURL: 'http://localhost:5173',
       trace: 'on-first-retry',
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
     ],
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:5173',
       reuseExistingServer: !process.env.CI,
       timeout: 120 * 1000,
     },
   });
   ```
3. **윈도우(Windows PowerShell) 환경 실행**:
   - `npx playwright test`
   - `npx playwright test --ui` (GUI 러너)

---

## 5. 구체적 구현 권장사항 및 코드 설계

### 5.1 React `ErrorBoundary` 컴포넌트 및 세련된 Fallback UI 설계

#### A. `src/components/ErrorBoundary.tsx`
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[250px] w-full p-6 my-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 shadow-lg transition-all" data-testid="error-boundary-fallback">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30 shadow-inner">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {this.props.fallbackTitle || '컴포넌트를 불러오는 중 오류가 발생했습니다.'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              예상치 못한 렌더링 예외가 발생했습니다. 아래 버튼을 눌러 다시 시도하거나 페이지를 새로고침하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> 홈으로 이동
            </button>
          </div>

          {/* 개발 모드 오류 세부 스택 트레이스 */}
          {isDev && this.state.error && (
            <div className="w-full max-w-xl text-left mt-4 border border-slate-300 dark:border-neutral-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-neutral-900">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="w-full px-4 py-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <span>개발자 상세 에러 정보 (Developer Error Logs)</span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {this.state.showDetails && (
                <div className="p-4 border-t border-slate-300 dark:border-neutral-800 text-[11px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto space-y-2 max-h-60">
                  <div><strong>Error:</strong> {this.state.error.toString()}</div>
                  {this.state.errorInfo && (
                    <pre className="text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### B. ErrorBoundary 적용 위치 권장안
1. **전역 래핑 (`src/App.tsx` 혹은 `src/main.tsx`)**: 앱 최상단을 래핑하여 전체 멈춤 방지.
2. **대화 메시지 단위 래핑 (`src/components/ChatMessageItem.tsx`)**: 특정 메시지의 마크다운/KaTeX 파싱 에러가 발생하더라도 다른 대화 메시지 및 입력창은 정상 유지되도록 부분 래핑.

---

### 5.2 Error Boundary 검증 Playwright E2E 테스트 설계

#### `frontend/e2e/error-boundary.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('ErrorBoundary Component E2E Tests', () => {
  test('rendering error in child component renders Fallback UI with retry option', async ({ page }) => {
    // 1. 테스트용 에러 유발 컴포넌트 페이지 접속 (또는 모의 컴포넌트 렌더링)
    await page.goto('/?test_error=true');

    // 2. Fallback UI 표시 검증
    const fallback = page.locator('[data-testid="error-boundary-fallback"]');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('컴포넌트를 불러오는 중 오류가 발생했습니다.');

    // 3. 다시 시도 버튼 존재 검증
    const retryBtn = page.getByRole('button', { name: '다시 시도' });
    await expect(retryBtn).toBeVisible();

    // 4. 개발자 모드 에러 상세 토글 검증
    const devToggle = page.getByText('개발자 상세 에러 정보');
    if (await devToggle.isVisible()) {
      await devToggle.click();
      await expect(page.locator('pre')).toBeVisible();
    }
  });
});
```

---

### 5.3 스켈레톤 로딩 UI 컴포넌트 및 마이크로 애니메이션 설계

#### A. CSS 마이크로 애니메이션 (`src/index.css`)
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  position: relative;
  overflow: hidden;
}

.animate-shimmer::after {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.2) 60%,
    rgba(255, 255, 255, 0)
  );
  animation: shimmer 1.8s infinite;
  content: '';
}
```

#### B. 채팅 메시지 스켈레톤 컴포넌트 (`src/components/skeletons/ChatMessageSkeleton.tsx`)
```tsx
import React from 'react';

export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full py-4 px-4" data-testid="chat-message-skeleton">
      {/* User message skeleton */}
      <div className="flex gap-4 items-start py-3">
        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-neutral-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-20 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Assistant message skeleton with shimmer */}
      <div className="flex gap-4 items-start py-4 px-4 rounded-xl bg-slate-100/70 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/40">
        <div className="w-8 h-8 rounded-full bg-indigo-600/40 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-3 w-28 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="space-y-2 animate-shimmer rounded-lg">
            <div className="h-4 w-5/6 bg-slate-300 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-4/6 bg-slate-300 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-300 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

### 5.4 스켈레톤 로딩 검증 Playwright E2E 테스트 설계

#### `frontend/e2e/skeleton-loading.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Skeleton Loading UI E2E Tests', () => {
  test('asserts skeleton UI visibility during API delay', async ({ page }) => {
    // 1. 세션 조회 API 지연 (1500ms) 목킹
    await page.route('**/api/v1/sessions/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-1',
          title: '테스트 대화',
          messages: [
            { id: 'm1', role: 'user', content: '안녕하세요' },
            { id: 'm2', role: 'assistant', content: '반갑습니다! 무엇을 도와드릴까요?' }
          ]
        })
      });
    });

    // 2. 해당 세션 URL로 이동
    await page.goto('/c/test-session-1');

    // 3. 지연 시간 동안 스켈레톤 UI 노출 검증
    const skeleton = page.locator('[data-testid="chat-message-skeleton"]');
    await expect(skeleton).toBeVisible();

    // 4. API 응답 후 스켈레톤 사라지고 실제 메시지 표시 검증
    await expect(skeleton).toBeHidden({ timeout: 3000 });
    await expect(page.getByText('반갑습니다! 무엇을 도와드릴까요?')).toBeVisible();
  });
});
```

---

## 6. 요약 및 추진 로드맵

1. **1단계**: Playwright 패키지 설치 및 `playwright.config.ts` 구성
2. **2단계**: `ErrorBoundary.tsx` 컴포넌트 및 CSS shimmer 애니메이션 작성
3. **3단계**: `ChatMessageSkeleton.tsx` 작성 및 `App.tsx` 로딩 상태 대체
4. **4단계**: `frontend/e2e/error-boundary.spec.ts` 및 `skeleton-loading.spec.ts` 구현 및 E2E 테스트 검증 실행
