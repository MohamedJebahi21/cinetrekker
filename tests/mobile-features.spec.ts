import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

const tmdbResults = Array.from({ length: 8 }).map((_, index) => ({
  id: 1000 + index,
  title: `Mock Title ${index + 1}`,
  overview: `Mock overview ${index + 1}`,
  poster_path: `/poster-${index + 1}.jpg`,
  backdrop_path: `/backdrop-${index + 1}.jpg`,
  vote_average: 8.1,
  release_date: `2026-01-${String(index + 1).padStart(2, "0")}`,
  media_type: "movie",
}));

async function mockTmdbProxy(page: Page) {
  await page.route("**/tmdb-proxy**", async (route: Route) => {
    const url = new URL(route.request().url());
    const endpoint = url.searchParams.get("endpoint") || "";

    if (
      endpoint === "/movie/now_playing" ||
      endpoint === "/trending/all/week" ||
      endpoint === "/trending/all/day" ||
      endpoint === "/search/multi" ||
      endpoint === "/discover/movie" ||
      endpoint === "/discover/tv"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: 1,
          results: tmdbResults,
          total_pages: 1,
          total_results: tmdbResults.length,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }),
    });
  });
}

test.describe("Mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockTmdbProxy(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("hamburger menu opens, shows links, and closes", async ({ page }) => {
    const openMenuButton = page.getByRole("button", { name: /^menu$/i });
    const mobileDialog = page.getByRole("dialog", { name: /menu/i });

    await expect(openMenuButton).toBeVisible();
    await openMenuButton.click();

    await expect(mobileDialog).toBeVisible();
    await expect(
      mobileDialog.getByRole("navigation", { name: /main navigation/i }),
    ).toBeVisible();
    await expect(mobileDialog.getByRole("link", { name: /^search$/i })).toBeVisible();

    await mobileDialog.getByRole("link", { name: /^search$/i }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test("bottom navigation routes to search and protected destinations", async ({ page }) => {
    const mobileNav = page.locator("nav.mobile-nav-safe");

    await expect(mobileNav.getByRole("button", { name: /^search$/i })).toBeVisible();
    await mobileNav.getByRole("button", { name: /^search$/i }).click();
    await expect(page).toHaveURL(/\/search$/);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await mobileNav.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("slash shortcuts do not open a second search dialog", async ({ page }) => {
    await page.keyboard.press("/");
    await expect(page.getByRole("dialog", { name: /search/i })).toHaveCount(0);

    await page.keyboard.press("Control+/");
    await expect(page.getByRole("dialog", { name: /search/i })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Mobile carousel", () => {
  test("home carousel renders and supports paging", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockTmdbProxy(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const carouselSection = page
      .locator("section")
      .filter({ has: page.getByRole("button", { name: /go to carousel page/i }) })
      .first();

    const pageButtons = carouselSection.getByRole("button", {
      name: /go to carousel page/i,
    });
    await expect.poll(async () => pageButtons.count(), { timeout: 15000 }).toBeGreaterThan(1);

    await pageButtons.nth(1).click();
    await expect(pageButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
  });

  test("search page accepts typed queries on mobile", async ({ page }) => {
    await mockTmdbProxy(page);
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[type="text"][inputmode="search"]:visible').first();

    await expect(searchInput).toBeVisible();
    await searchInput.fill("inception");
    await expect(searchInput).toHaveValue("inception");
  });
});