import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    __cinetrekkerGetCumulativeLayoutShift?: () => number;
  }
}

async function startLayoutShiftMeasurement(page: Page) {
  await page.addInitScript(() => {
    let cumulativeLayoutShift = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntryList) {
          const shift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };

          if (!shift.hadRecentInput) {
            cumulativeLayoutShift += shift.value ?? 0;
          }
        }
      });

      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      // The quality gate is Chromium-only; unsupported engines simply do not
      // expose the Layout Instability API.
    }

    window.__cinetrekkerGetCumulativeLayoutShift = () => cumulativeLayoutShift;
  });
}

async function expectStableInitialLoad(
  page: Page,
  path: string,
  readySelector: string,
  selectLastMatch = false,
) {
  await startLayoutShiftMeasurement(page);
  await page.goto(path);
  const readyTarget = page.locator(readySelector);
  await expect(selectLastMatch ? readyTarget.last() : readyTarget).toBeVisible();
  await page.waitForTimeout(1_200);

  const cls = await page.evaluate(
    () => window.__cinetrekkerGetCumulativeLayoutShift?.() ?? 0,
  );

  // A local deterministic guardrail that catches large post-load replacements.
  // Field Web Vitals remain the source of truth for the 0.1 CLS target.
  expect(cls).toBeLessThanOrEqual(0.15);
}

test.describe("CineTrekker discovery layout stability", () => {
  test("home maintains a stable initial shell", async ({ page }) => {
    await expectStableInitialLoad(page, "/", "header");
  });

  test("search maintains a stable initial shell", async ({ page }) => {
    await expectStableInitialLoad(
      page,
      "/search?q=yiralti",
      'input[placeholder="Search movies, TV shows, actors..."]',
      true,
    );
  });
});
