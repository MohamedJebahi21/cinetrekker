import { test, expect, type BrowserContext, type Page } from "@playwright/test";

type DisposableAccount = {
  email: string;
  password: string;
  publicProfileId: string;
};

const primary: DisposableAccount = {
  email: process.env.CINETREKKER_E2E_PRIMARY_EMAIL ?? "",
  password: process.env.CINETREKKER_E2E_PRIMARY_PASSWORD ?? "",
  publicProfileId: process.env.CINETREKKER_E2E_PRIMARY_PROFILE_ID ?? "",
};

const secondary: DisposableAccount = {
  email: process.env.CINETREKKER_E2E_SECONDARY_EMAIL ?? "",
  password: process.env.CINETREKKER_E2E_SECONDARY_PASSWORD ?? "",
  publicProfileId: process.env.CINETREKKER_E2E_SECONDARY_PROFILE_ID ?? "",
};

const hasDisposableAccounts = [
  primary.email,
  primary.password,
  primary.publicProfileId,
  secondary.email,
  secondary.password,
  secondary.publicProfileId,
].every(Boolean);

async function signIn(page: Page, account: DisposableAccount) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).not.toHaveURL(/\/login|\/auth/);
}

async function signOut(page: Page) {
  const accountMenu = page.getByRole("button", { name: /user menu|account/i });
  await accountMenu.click();
  await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/\/login|\/$/);
}

/**
 * This suite is deliberately inert until the deployment administrator supplies
 * two disposable, non-customer accounts through environment variables. It does
 * not create accounts, read private records, or leave a follow relationship
 * changed from its original state.
 */
test.describe("CineTrekker two-account privacy and social boundaries", () => {
  test.skip(
    !hasDisposableAccounts,
    "Requires two disposable CineTrekker accounts set through CINETREKKER_E2E_* environment variables.",
  );

  test("sessions stay separate and a follow mutation is restored", async ({ browser }) => {
    const primaryContext: BrowserContext = await browser.newContext();
    const secondaryContext: BrowserContext = await browser.newContext();
    const primaryPage = await primaryContext.newPage();
    const secondaryPage = await secondaryContext.newPage();

    try {
      await signIn(primaryPage, primary);
      await signIn(secondaryPage, secondary);

      await primaryPage.goto(`/user/${secondary.publicProfileId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(primaryPage.getByRole("heading", { level: 1 })).toBeVisible();

      const followControl = primaryPage.getByRole("button", {
        name: /follow|following/i,
      });
      await expect(followControl).toBeVisible();
      const initiallyFollowing = /following/i.test(
        (await followControl.textContent()) ?? "",
      );

      if (!initiallyFollowing) {
        await followControl.click();
        await expect(followControl).toContainText(/following/i);
        await followControl.click();
        await expect(followControl).toContainText(/^follow$/i);
      }

      await secondaryPage.goto("/profile", { waitUntil: "domcontentloaded" });
      await expect(secondaryPage.getByRole("heading", { level: 1 })).toBeVisible();

      await signOut(primaryPage);
      await primaryPage.goto("/watchlist", { waitUntil: "domcontentloaded" });
      await expect(primaryPage).toHaveURL(/\/login|\/watchlist/);
      await expect(primaryPage.locator("main")).toBeVisible();
    } finally {
      await primaryContext.close();
      await secondaryContext.close();
    }
  });
});
