import { expect, test } from "@playwright/test";

test("fresh tablet Discover session does not emit GoTrue lock warnings", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  const lockWarnings: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/gotrue.*lock|lock.*gotrue|navigator\.locks/i.test(text)) {
      lockWarnings.push(text);
    }
  });

  await page.goto("/discover");
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(3500);

  expect(lockWarnings).toEqual([]);
});
