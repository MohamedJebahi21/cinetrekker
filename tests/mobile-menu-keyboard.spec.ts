import { expect, test } from "@playwright/test";

test("mobile menu contains keyboard focus and restores it after Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();

  const menuTrigger = page.locator('button[aria-label="Menu"]:visible');
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.click();

  const panel = page.locator("#mobile-menu-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("role", "dialog");

  for (let step = 0; step < 14; step += 1) {
    await page.keyboard.press("Tab");
    const isInsideMenu = await page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof Element && Boolean(active.closest("#mobile-menu-panel"));
    });
    expect(isInsideMenu, `Focus left the open mobile menu after Tab ${step + 1}`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(menuTrigger).toBeFocused();
});
