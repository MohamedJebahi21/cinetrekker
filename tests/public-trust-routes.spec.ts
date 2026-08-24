import { expect, test } from "@playwright/test";

test.describe("public trust and transparency routes", () => {
  test("trust center exposes core control and support paths", async ({ page }) => {
    await page.goto("/trust");

    await expect(page.getByRole("heading", { name: "Built for a personal, controlled viewing space" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review measurement methodology" })).toHaveAttribute("href", "/measurement");
    await expect(page.getByRole("link", { name: "View service status" })).toHaveAttribute("href", "/status");
  });

  test("measurement and partnership principles avoid data and audience promises", async ({ page }) => {
    await page.goto("/measurement");
    await expect(page.getByRole("heading", { name: "How CineTrekker measures product health" })).toBeVisible();
    await expect(page.getByText(/excludes title names and IDs, search text, ratings/i)).toBeVisible();

    await page.goto("/partnerships");
    await expect(page.getByRole("heading", { name: "A transparent standard for any future sponsorship" })).toBeVisible();
    await expect(page.getByText(/No advertisements, audience guarantees, or partner commitments/i)).toBeVisible();
  });
});
