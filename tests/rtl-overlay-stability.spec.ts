import { expect, test } from "@playwright/test";

async function geometry(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body.getBoundingClientRect();
    const header = document.querySelector("header")?.getBoundingClientRect();
    return {
      direction: root.dir,
      scrollbarGutter: getComputedStyle(root).scrollbarGutter,
      bodyLeft: body.left,
      bodyRight: body.right,
      bodyWidth: body.width,
      headerLeft: header?.left,
      headerRight: header?.right,
    };
  });
}

test("Arabic Preferences overlay keeps the desktop page geometry fixed while scroll locking", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("i18nextLng", "ar"));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: "التفضيلات" })).toBeVisible();
  const before = await geometry(page);

  await page.getByRole("button", { name: "التفضيلات" }).click();
  await expect(page.getByText("ضوابط سريعة", { exact: true })).toBeVisible();
  const after = await geometry(page);

  expect(before.direction).toBe("rtl");
  expect(before.scrollbarGutter).toBe("stable both-edges");
  expect(after).toEqual(before);
});
