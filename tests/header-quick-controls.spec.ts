import { expect, test } from "@playwright/test";

test("Preferences exposes compact quick controls with reachable language and theme menus", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Preferences" }).click();
  await expect(page.getByText("Quick controls", { exact: true })).toBeVisible();
  await expect(page.getByText("Account, privacy, and notifications", { exact: true })).toBeVisible();

  const language = page.getByRole("menuitem", { name: /Change language English/ });
  await language.hover();
  await expect(page.getByRole("menuitemradio", { name: "English" })).toBeVisible();

  const theme = page.getByRole("menuitem", { name: /Change theme/ });
  await theme.hover();
  await expect(page.getByRole("menuitem", { name: /Dark.*Balanced/ })).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await expect(page.getByText("Pure black for OLED displays", { exact: true })).toBeVisible();
});
