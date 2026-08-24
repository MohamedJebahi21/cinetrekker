import { test, expect, type Page } from "@playwright/test";

async function prepareStableVisualState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("cinetrekker_cookie_consent", "accepted");
    window.localStorage.setItem("cinetrekker_theme", "dark");
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function removeMotionForScreenshot(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0ms !important;
        caret-color: transparent !important;
      }
    `,
  });
}

const recoveryProfilePath = "/user/00000000-0000-0000-0000-000000000000";

test.describe("CineTrekker visual regression — desktop", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Visual baselines are reviewed and maintained for Chromium only.");
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });

  test("home discovery shell remains visually stable", async ({ page }) => {
    await prepareStableVisualState(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header").first()).toBeVisible();
    await removeMotionForScreenshot(page);

    await expect(page).toHaveScreenshot("home-desktop.png", {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      mask: [page.locator("main img")],
      maxDiffPixelRatio: 0.015,
    });
  });

  test("search discovery shell remains visually stable", async ({ page }) => {
    await prepareStableVisualState(page);
    await page.goto("/search?q=yiralti", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await removeMotionForScreenshot(page);

    await expect(page).toHaveScreenshot("search-desktop.png", {
      animations: "disabled",
      caret: "hide",
      clip: { x: 0, y: 0, width: 1440, height: 520 },
      maxDiffPixelRatio: 0.01,
    });
  });

  test("public-profile recovery state remains visually stable", async ({ page }) => {
    await prepareStableVisualState(page);
    await page.goto(recoveryProfilePath, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Profile not found" })).toBeVisible();
    await removeMotionForScreenshot(page);

    await expect(page).toHaveScreenshot("public-profile-recovery-desktop.png", {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("CineTrekker visual regression — mobile", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Visual baselines are reviewed and maintained for Chromium only.");
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true });

  test("mobile home shell and bottom navigation remain visually stable", async ({ page }) => {
    await prepareStableVisualState(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator("nav.mobile-nav-safe")).toBeVisible();
    await removeMotionForScreenshot(page);

    await expect(page).toHaveScreenshot("home-mobile.png", {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      mask: [page.locator("main img")],
      maxDiffPixelRatio: 0.015,
    });
  });

  test("mobile search shell remains visually stable", async ({ page }) => {
    await prepareStableVisualState(page);
    await page.goto("/search?q=yiralti", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await removeMotionForScreenshot(page);

    await expect(page).toHaveScreenshot("search-mobile.png", {
      animations: "disabled",
      caret: "hide",
      clip: { x: 0, y: 0, width: 390, height: 460 },
      maxDiffPixelRatio: 0.01,
    });
  });
});
