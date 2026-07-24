import { test, expect } from '@playwright/test';

test.describe('Skeleton Loading UI E2E Tests', () => {
  test('asserts skeleton UI visibility with shimmer animation during API delay', async ({ page }) => {
    // 1. localStorage에 더미 인증 토큰 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'mock-test-token');
    });

    // 2. 인증 및 설정 API 목킹 (regex 패턴 사용)
    await page.route(/\/api\/v1\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u1',
          username: 'testuser',
          email: 'test@example.com',
          is_admin: false,
          is_active: true,
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route(/\/api\/v1\/settings\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dark_mode: false }),
      });
    });

    await page.route(/\/api\/v1\/settings\/instructions/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ instruction: '' }),
      });
    });

    await page.route(/\/api\/v1\/custom-instructions/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ custom_instructions: '' }),
      });
    });

    await page.route(/\/api\/v1\/sessions$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-session-1',
            title: '테스트 대화',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // 3. 세션 상세 조회 API 지연 (2000ms) 목킹
    await page.route(/\/api\/v1\/sessions\/test-session-1/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-1',
          title: '테스트 대화',
          messages: [
            {
              id: 'm1',
              session_id: 'test-session-1',
              role: 'user',
              content: '안녕하세요',
              created_at: new Date().toISOString(),
            },
            {
              id: 'm2',
              session_id: 'test-session-1',
              role: 'assistant',
              content: '반갑습니다! 무엇을 도와드릴까요?',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // 4. 해당 세션 URL로 이동
    await page.goto('/c/test-session-1');

    // 5. API 응답 지연 동안 스켈레톤 UI 및 마이크로 애니메이션 노출 검증
    const skeleton = page.locator('[data-testid="chat-message-skeleton"]');
    await expect(skeleton).toBeVisible();

    const shimmerElement = page.locator('.animate-shimmer').first();
    await expect(shimmerElement).toBeVisible();

    // 6. API 응답 완료 후 스켈레톤이 숨겨지고 실제 대화 내용 표시 검증
    await expect(skeleton).toBeHidden({ timeout: 4000 });
    await expect(page.getByText('반갑습니다! 무엇을 도와드릴까요?')).toBeVisible();
  });
});
