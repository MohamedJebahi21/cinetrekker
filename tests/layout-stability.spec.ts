import { expect, test } from "@playwright/test";

test("opening Preferences preserves the desktop header position", async ({ page }) => {
  await page.goto("/");

  const preferences = page.getByRole("button", { name: "Preferences" });
  await expect(preferences).toBeVisible();

  const before = await page.evaluate(() => {
    const header = document.querySelector("header");
    return {
      clientWidth: document.documentElement.clientWidth,
      headerLeft: header?.getBoundingClientRect().left ?? null,
      scrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter,
    };
  });

  await preferences.click();
  await expect(page.getByRole("menu")).toBeVisible();

  const whileOpen = await page.evaluate(() => {
    const header = document.querySelector("header");
    return {
      clientWidth: document.documentElement.clientWidth,
      headerLeft: header?.getBoundingClientRect().left ?? null,
    };
  });

  expect(before.scrollbarGutter).toBe("stable both-edges");
  expect(whileOpen.clientWidth).toBe(before.clientWidth);
  expect(whileOpen.headerLeft).toBe(before.headerLeft);
});
