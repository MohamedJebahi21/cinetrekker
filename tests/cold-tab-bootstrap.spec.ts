import { test, expect } from "@playwright/test";

test.describe("cold new-tab application bootstrap", () => {
  test("opening a direct People link in a new tab hydrates beyond the static skeleton", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.locator("header").first()).toBeVisible();

    const [newTab] = await Promise.all([
      context.waitForEvent("page"),
      page.evaluate(() => window.open("/people", "_blank")),
    ]);

    await newTab.waitForLoadState("domcontentloaded");
    await expect(
      newTab.getByRole("heading", { name: "Find people with great taste." }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(newTab.locator("#app-shell")).toHaveCount(0);
  });

  test("opening a direct public-profile link in a new tab resolves its recovery state", async ({ page, context }) => {
    await page.goto("/");

    const [newTab] = await Promise.all([
      context.waitForEvent("page"),
      page.evaluate(() =>
        window.open("/user/00000000-0000-0000-0000-000000000000", "_blank"),
      ),
    ]);

    await newTab.waitForLoadState("domcontentloaded");
    await expect(
      newTab.getByRole("heading", { name: "Profile not found" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(newTab.locator("#app-shell")).toHaveCount(0);
  });
});

test.describe("bootstrap recovery", () => {
  test("a failed startup module replaces the static skeleton with a reloadable recovery state", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __CT_BOOT_TIMEOUT_MS__?: number }).__CT_BOOT_TIMEOUT_MS__ = 25;
    });
    await page.route(
      (url) =>
        /\/src\/main\.tsx(?:\?.*)?$/.test(url.href) ||
        /\/assets\/index-[^/]+\.js(?:\?.*)?$/.test(url.href),
      (route) => route.abort(),
    );

    await page.goto("/people");

    await expect(
      page.getByRole("heading", { name: "CineTrekker could not finish loading" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("link", { name: "Reload page" })).toHaveAttribute(
      "href",
      /\/people/,
    );
    await expect(page.locator("#app-shell")).toHaveCount(0);
  });
});
