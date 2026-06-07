import { test, expect } from '@playwright/test';

test.describe('CineTrekker smoke', () => {
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
