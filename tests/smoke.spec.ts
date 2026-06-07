import { test, expect, type Page } from '@playwright/test';

type GuardedPage = Page & {
  __trustedTypesViolations?: string[];
};

const TRUSTED_TYPES_SEO_ERROR_PATTERN =
  /Trusted Types: script sinks are not allowed|ErrorBoundary caught an error:\s*TypeError:\s*Trusted Types/i;

test.describe('CineTrekker smoke', () => {
  test.beforeEach(async ({ page }) => {
    const guardedPage = page as GuardedPage;
    guardedPage.__trustedTypesViolations = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (TRUSTED_TYPES_SEO_ERROR_PATTERN.test(text)) {
        guardedPage.__trustedTypesViolations?.push(text);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    const violations = (page as GuardedPage).__trustedTypesViolations ?? [];
    expect(
      violations,
      'Trusted Types SEO runtime violations were emitted in browser console.',
    ).toEqual([]);
  });

  test('home page loads and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CineTrekker|CineTrekker/i);
    // check that header or main hero exists
    const header = page.locator('header');
    await expect(header.first()).toBeVisible();
  });

  test('search page loads and can type query', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search/);
    const input = page.locator('input[type="search"], input[name="q"]');
    if (await input.count() > 0) {
      await input.first().fill('inception');
      await expect(input.first()).toHaveValue('inception');
    } else {
      // fallback: ensure main content exists
      const main = page.locator('main');
      await expect(main).toBeVisible();
    }
  });
});
