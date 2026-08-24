import { expect, test, type Page, type Route } from "@playwright/test";

async function mockTvSeasonDetails(page: Page) {
  await page.route("**/tmdb-proxy**", async (route) => {
    const endpoint = new URL(route.request().url()).searchParams.get("endpoint");

    if (endpoint === "/tv/1396") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1396,
          name: "Fixture series",
          overview: "Deterministic season selection fixture.",
          poster_path: null,
          backdrop_path: null,
          first_air_date: "2020-01-01",
          vote_average: 8,
          number_of_seasons: 3,
          number_of_episodes: 24,
          status: "Returning Series",
          genres: [],
          networks: [],
          seasons: [
            { season_number: 1, air_date: "2020-01-01", poster_path: null, episode_count: 8, name: "Season 1" },
            { season_number: 2, air_date: "2021-01-01", poster_path: null, episode_count: 8, name: "Season 2" },
            { season_number: 3, air_date: "2022-01-01", poster_path: null, episode_count: 8, name: "Season 3" },
          ],
          credits: { cast: [], crew: [] },
          similar: { results: [] },
          recommendations: { results: [] },
          videos: { results: [] },
          keywords: { results: [] },
          external_ids: {},
          images: { backdrops: [], posters: [] },
        }),
      });
      return;
    }

    if (endpoint === "/tv/1396/season/2") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 2, name: "Season 2", air_date: "2021-01-01", episodes: [] }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) });
  });
}

test.describe("Continue Watching", () => {
  test("guest home page does not show Continue Watching section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /continue watching/i }),
    ).toHaveCount(0);
  });

  test("guest home empty-state CTA is not shown without auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/nothing to continue yet/i),
    ).toHaveCount(0);
  });
});

test.describe("TV details season deep-link", () => {
  test("season query param selects the requested season tab", async ({ page }) => {
    test.setTimeout(60_000);
    await mockTvSeasonDetails(page);
    await page.goto("/tv/breaking-bad-1396?season=2");
    await expect(page.locator("main").first()).toBeVisible();

    const seasonTwoTab = page.getByRole("button", { name: /S2/ }).first();
    await expect(seasonTwoTab).toBeVisible({ timeout: 30_000 });
    await expect(seasonTwoTab).toHaveClass(/bg-primary/);
  });
});
