import { expect, test } from "@playwright/test";

test("desktop menu handles Escape, returns focus, and keeps keyboard focus within links", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menu" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  const links = menu.getByRole("link");
  const count = await links.count();
  expect(count).toBeGreaterThan(1);
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(links.last()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).overflow)).not.toBe("hidden");
});

test("mobile sheet closes with Escape, restores focus, and releases scroll lock", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menu" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Sign In", exact: true }).first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.locator("body").evaluate((body) => getComputedStyle(body).overflow)).not.toBe("hidden");
});

test("mobile bottom navigation exposes its visual order and visible keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Main navigation" }).last();
  const items = nav.getByRole("button");
  await expect(items).toHaveCount(5);
  const labels = await items.allTextContents();
  expect(labels.map((label) => label.trim())).toEqual(["Home", "Discover", "Search", "Watchlist", "Sign In"]);

  for (let index = 0; index < 5; index += 1) {
    await items.nth(index).focus();
    await expect(items.nth(index)).toBeFocused();
    const focusStyle = await items.nth(index).evaluate((element) => {
      const styles = getComputedStyle(element);
      return styles.outlineWidth !== "0px" || styles.boxShadow !== "none";
    });
    expect(focusStyle).toBe(true);
  }
});
