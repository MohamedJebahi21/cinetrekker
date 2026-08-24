import { test, expect } from "@playwright/test";

test.describe("profile and social discovery", () => {
  test("people directory presents a labelled search and a useful empty state", async ({ page }) => {
    await page.goto("/people");

    await expect(
      page.getByRole("heading", { name: "Find people with great taste." }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Search CineTrekker members" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No public profiles to show yet" }),
    ).toBeVisible();
  });

  test("unavailable public profile gives a named recovery link", async ({ page }) => {
    await page.goto("/user/00000000-0000-0000-0000-000000000000");

    await expect(
      page.getByRole("heading", { name: "Profile not found" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
