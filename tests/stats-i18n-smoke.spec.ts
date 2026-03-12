import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readLocale(locale: string): Record<string, unknown> {
  const filePath = join(process.cwd(), "src", "locales", `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

test.describe("stats i18n smoke", () => {
  test("fr/ar locale files include required stats keys", async () => {
    const requiredKeys = [
      "stats.shareStats",
      "stats.yourTopGenres",
      "stats.enhancedSeoTitle",
      "stats.totalWatchTime",
      "stats.genreBreakdown",
    ];

    for (const locale of ["fr", "ar"]) {
      const data = readLocale(locale);
      for (const key of requiredKeys) {
        const value = getNestedValue(data, key);
        expect(
          typeof value === "string" && value.length > 0,
          `Missing or empty key '${key}' in ${locale}.json`,
        ).toBe(true);
      }
    }
  });

  test("language detector applies RTL/LTR document direction", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      window.localStorage.setItem("i18nextLng", "ar");
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.evaluate(() => {
      window.localStorage.setItem("i18nextLng", "fr");
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("stats routes remain protected in fr/ar contexts", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.setItem("i18nextLng", "ar");
    });
    await page.goto("/stats");
    await expect(page).toHaveURL(/\/login$/);

    await page.evaluate(() => {
      window.localStorage.setItem("i18nextLng", "fr");
    });
    await page.goto("/enhanced-stats");
    await expect(page).toHaveURL(/\/login$/);
  });
});
