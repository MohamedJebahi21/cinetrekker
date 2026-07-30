import { expect, test } from "@playwright/test";

test.describe("Continue Watching", () => {
  test("guest home page does not show Continue Watching section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /continue watching/i }),
    ).toHaveCount(0);
  });

  test("guest home empty-state CTA is not shown without auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/nothing to continue yet/i),
    ).toHaveCount(0);
  });
});

test.describe("TV details season deep-link", () => {
  test("season query param selects the requested season tab", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/tv/breaking-bad-1396?season=2");
    await expect(page.locator("main").first()).toBeVisible();

    const seasonTwoTab = page.getByRole("button", { name: /^S2\b/ }).first();
    await expect(seasonTwoTab).toBeVisible({ timeout: 30_000 });
    await expect(seasonTwoTab).toHaveClass(/bg-primary/);
  });
});
