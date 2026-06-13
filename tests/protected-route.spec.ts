import { expect, test } from "@playwright/test";

const protectedPaths = [
  "/settings",
  "/profile",
  "/stats",
  "/enhanced-stats",
];

const guestAccessiblePaths = ["/watchlist", "/watched"];

test.describe("ProtectedRoute redirects", () => {
  for (const path of protectedPaths) {
    test(`unauthenticated visit to ${path} redirects to /login`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

test.describe("Guest-accessible list routes", () => {
  for (const path of guestAccessiblePaths) {
    test(`unauthenticated visit to ${path} stays on route`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
      await expect(page.locator("main").first()).toBeVisible();
    });
  }
});
