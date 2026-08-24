import { expect, test } from "@playwright/test";

const mobileRoutes = ["/", "/search", "/people", "/privacy"];

test("keyboard users can reach a visible, touch-sized primary control on the home route", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const focus = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    const bounds = element?.getBoundingClientRect();
    return {
      tag: element?.tagName,
      width: bounds?.width ?? 0,
      height: bounds?.height ?? 0,
      ariaLabel: element?.getAttribute("aria-label"),
    };
  });

  expect(["A", "BUTTON", "INPUT"]).toContain(focus.tag);
  expect(Math.max(focus.width, focus.height)).toBeGreaterThanOrEqual(44);
});

test("core public routes reflow without horizontal overflow at mobile viewport width", async ({ page }) => {
  for (const route of mobileRoutes) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, route).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test("Arabic uses RTL document direction while keeping the localized preferences control reachable", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("i18nextLng", "ar"));
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: "التفضيلات" })).toBeVisible();
});
