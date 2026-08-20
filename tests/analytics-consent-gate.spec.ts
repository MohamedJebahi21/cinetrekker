import { expect, test, type Page } from "@playwright/test";

const CONSENT_KEY = "cinetrekker_cookie_consent";
const UMAMI_SCRIPT_SELECTOR = "script#cinetrekker-umami-script";

async function prepareVisitor(
  page: Page,
  consent: "accepted" | "rejected" | null,
  doNotTrack = false,
) {
  await page.addInitScript(
    ({ consentKey, consentChoice, shouldEnableDoNotTrack }) => {
      window.localStorage.removeItem(consentKey);

      if (consentChoice) {
        window.localStorage.setItem(consentKey, consentChoice);
      }

      if (shouldEnableDoNotTrack) {
        Object.defineProperty(window.navigator, "doNotTrack", {
          configurable: true,
          get: () => "1",
        });
      }
    },
    {
      consentKey: CONSENT_KEY,
      consentChoice: consent,
      shouldEnableDoNotTrack: doNotTrack,
    },
  );
}

async function expectNoUmamiScript(page: Page) {
  await expect(page.locator(UMAMI_SCRIPT_SELECTOR)).toHaveCount(0);
  await expect(page.locator('script[src*="umami"]')).toHaveCount(0);
}

test.describe("analytics consent gate", () => {
  test("does not load Umami before a visitor chooses cookie preferences", async ({ page }) => {
    await prepareVisitor(page, null);

    await page.goto("/");

    await expectNoUmamiScript(page);
  });

  test("does not load Umami after non-essential cookies are rejected", async ({ page }) => {
    await prepareVisitor(page, "rejected");

    await page.goto("/");

    await expectNoUmamiScript(page);
  });

  test("does not load Umami when the visitor has enabled Do Not Track", async ({ page }) => {
    await prepareVisitor(page, "accepted", true);

    await page.goto("/");

    await expectNoUmamiScript(page);
  });
});
