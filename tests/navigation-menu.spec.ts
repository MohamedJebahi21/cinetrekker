import { expect, test } from "@playwright/test";

test("desktop group menu filters guest routes and restores focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menu" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Recommendations", exact: true })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).overflow)).not.toBe("hidden");
});

test("mobile menu filters guest routes and restores focus without leaving scroll locked", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menu" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Sign In", exact: true }).first()).toBeVisible();
  await expect(menu.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Recommendations", exact: true })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).overflow)).not.toBe("hidden");
});

test("mobile bottom navigation follows visual order and shows keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const items = nav.getByRole("button");
  await expect(items).toHaveCount(5);
  await items.first().focus();

  for (let index = 0; index < 5; index += 1) {
    if (index > 0) await page.keyboard.press("Tab");
    await expect(items.nth(index)).toBeFocused();
    const outlineWidth = await items.nth(index).evaluate((element) => getComputedStyle(element).outlineWidth);
    expect(Number.parseFloat(outlineWidth)).toBeGreaterThan(0);
  }
});

test("desktop group navigation follows visual order with a visible focus ring", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  const items = menu.getByRole("link");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  await expect(items.first()).toBeFocused();

  for (let index = 0; index < count; index += 1) {
    if (index > 0) await page.keyboard.press("Tab");
    await expect(items.nth(index)).toBeFocused();
    const outlineWidth = await items.nth(index).evaluate((element) => getComputedStyle(element).outlineWidth);
    expect(Number.parseFloat(outlineWidth)).toBeGreaterThan(0);
  }
});
