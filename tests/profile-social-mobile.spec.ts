import { test, expect } from "@playwright/test";


test.describe("mobile profile and social compatibility", () => {
  test.describe.configure({ mode: "serial" });
  test("people directory fits the mobile viewport and keeps search touch-ready", async ({ page }) => {
    await page.goto("/people");
    await expect(
      page.getByRole("heading", { name: "Find people with great taste." }),
    ).toBeVisible({ timeout: 15_000 });

    const search = page.getByRole("textbox", { name: "Search public profiles" });
    await expect(search).toBeVisible();

    const metrics = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[aria-label="Search public profiles"]',
      );
      const inputBounds = input?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        inputHeight: inputBounds?.height ?? 0,
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.inputHeight).toBeGreaterThanOrEqual(44);
  });

  test("unavailable public profile remains readable and recoverable on mobile", async ({ page }) => {
    await page.goto("/user/00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByRole("heading", { name: "Profile not found" }),
    ).toBeVisible({ timeout: 15_000 });

    const homeLink = page.getByRole("link", { name: "Go home" });
    await expect(homeLink).toBeVisible();

    const metrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  });
});
