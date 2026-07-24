import { test, expect } from '@playwright/test';

test.describe('ErrorBoundary Component E2E Tests', () => {
  test('rendering error in child component renders Fallback UI with retry option', async ({ page }) => {
    // 1. 테스트용 에러 유발 URL 접속
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

  test('navigating directly to /test-error triggers ErrorBoundary safely without white screen crash', async ({ page }) => {
    await page.goto('/test-error');

    const fallback = page.locator('[data-testid="error-boundary-fallback"]');
    await expect(fallback).toBeVisible();

    const homeBtn = page.getByRole('button', { name: '홈으로 이동' });
    await expect(homeBtn).toBeVisible();
  });
});
