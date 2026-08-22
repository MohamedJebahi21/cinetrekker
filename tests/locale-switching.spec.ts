import { expect, test } from "@playwright/test";

async function openLanguageMenu(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Preferences" }).click();
  await page.getByRole("menuitem", { name: /Change language English/ }).hover();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("i18nextLng", "en"));
});

test("switching to French loads the translated interface before the language changes", async ({ page }) => {
  await page.goto("/");
  await openLanguageMenu(page);

  await page.getByRole("menuitemradio", { name: "Français" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("banner").getByText("Accueil", { exact: true })).toBeVisible();
});

test("switching to Arabic loads Arabic interface copy and RTL direction", async ({ page }) => {
  await page.goto("/");
  await openLanguageMenu(page);

  await page.getByRole("menuitemradio", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("banner").getByText("الرئيسية", { exact: true })).toBeVisible();
});
