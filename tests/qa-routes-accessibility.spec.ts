import { expect, test } from "@playwright/test";

const routes = ["/", "/search", "/movie/550", "/profile"];

const viewports = [
  { width: 390, height: 844, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1280, height: 900, label: "desktop" },
];

test.describe("visual QA key routes", () => {
  for (const vp of viewports) {
    for (const route of routes) {
      test(`${vp.label}: ${route} renders without overflow`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);

        const noHorizontalOverflow = await page.evaluate(() => {
          const width = document.documentElement.scrollWidth;
          const viewport = window.innerWidth;
          return width <= viewport + 1;
        });

        await expect(page.locator("main").first()).toBeVisible();
        expect(noHorizontalOverflow).toBe(true);
      });
    }
  }
});

test.describe("accessibility focus and touch target checks", () => {
  test("keyboard focus is visible on primary controls", async ({ page }) => {
    await page.goto("/");

    const firstFocusable = page
      .locator(
        "a:visible, button:visible, input:visible, [tabindex='0']:visible",
      )
      .first();

    await firstFocusable.focus();
    const isVisible = await firstFocusable.isVisible();
    const focusVisible = await firstFocusable.evaluate((el) => {
      const style = getComputedStyle(el as HTMLElement);
      const hasOutline =
        style.outlineStyle !== "none" && style.outlineWidth !== "0px";
      const hasBoxShadow = style.boxShadow !== "none";
      return hasOutline || hasBoxShadow;
    });

    expect(isVisible).toBe(true);
    expect(focusVisible).toBe(true);
  });

  test("mobile primary controls meet 44px touch target minimum", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const results = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          "button, [role='button'], [role='tab'], [role='switch'], [data-radix-collection-item]",
        ),
      )
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none"
          );
        })
        .slice(0, 30);

      const failing = controls.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      });

      return {
        sampled: controls.length,
        failingCount: failing.length,
      };
    });

    expect(results.sampled).toBeGreaterThan(0);
    expect(results.failingCount).toBe(0);
  });
});
