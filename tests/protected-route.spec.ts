import { expect, test } from "@playwright/test";

const protectedPaths = [
  "/settings",
  "/profile",
  "/watchlist",
  "/stats",
  "/enhanced-stats",
];

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
