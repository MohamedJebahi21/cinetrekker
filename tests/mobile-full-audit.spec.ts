import { expect, test } from "@playwright/test";

const phoneViewports = [
  { width: 375, height: 812, label: "phone-375" },
  { width: 390, height: 844, label: "phone-390" },
];

const mobileRoutes = [
  "/",
  "/search",
  "/movie/550",
  "/tv/1399",
  "/calendar",
  "/watchlist",
  "/stats",
  "/achievements",
  "/awards",
  "/auth",
  "/notifications",
  "/settings",
  "/recommendations",
  "/year-in-review",
];

test.describe("full mobile route audit", () => {
  for (const vp of phoneViewports) {
    for (const route of mobileRoutes) {
      test(`${vp.label}: ${route} has no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);

        const result = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;

          const maxScrollWidth = Math.max(
            html.scrollWidth,
            body.scrollWidth,
            html.clientWidth,
            body.clientWidth,
          );

          const fixedLikeNodes = Array.from(
            document.querySelectorAll<HTMLElement>(
              "header, nav, [role='dialog'], [class*='fixed'], [class*='mobile-nav-safe']",
            ),
          ).filter((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          });

          const clippedFixed = fixedLikeNodes.some((el) => {
            const rect = el.getBoundingClientRect();
            return rect.left < -1 || rect.right > window.innerWidth + 1;
          });

          return {
            maxScrollWidth,
            viewportWidth: window.innerWidth,
            clippedFixed,
          };
        });

        expect(result.maxScrollWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
        expect(result.clippedFixed).toBe(false);
      });
    }
  }
});

test.describe("mobile overlays", () => {
  test("menu drawer stays fully in viewport and padded", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const openMenu = page.getByRole("button", { name: /^menu$/i });
    await expect(openMenu).toBeVisible();
    await openMenu.click();
    await page.waitForTimeout(350);

    const dialog = page.getByRole("dialog", { name: /menu/i });
    await expect(dialog).toBeVisible();

    const result = await dialog.evaluate((node) => {
      const panel = node as HTMLElement;
      const contentRoot = (panel.firstElementChild as HTMLElement | null) ?? panel;
      const panelRect = contentRoot.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      const links = Array.from(contentRoot.querySelectorAll("a,button"));
      const clippedItems = links.some((item) => {
        const el = item as HTMLElement;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1;
      });

      return {
        panelWidth: panelRect.width,
        viewportWidth,
        clippedItems,
      };
    });

    expect(result.panelWidth).toBeGreaterThan(0);
    expect(result.clippedItems, JSON.stringify(result)).toBe(false);
  });

  test("search filters drawer opens and remains usable on 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search", { waitUntil: "domcontentloaded" });

    const openFilters = page.getByRole("button", { name: /filters/i }).first();
    await expect(openFilters).toBeVisible();
    await openFilters.click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();

    const actionButtons = dialog.getByRole("button", { name: /apply|clear/i });
    await expect(actionButtons.first()).toBeVisible();
  });
});
