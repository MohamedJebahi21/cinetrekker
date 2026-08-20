import { chromium } from "playwright";

const targetUrl = "https://cinetrekker.vercel.app/";
const consentKey = "cinetrekker_cookie_consent";
const trackerHost = "cloud.umami.is";

const scenarios = [
  { name: "no decision", consent: null, doNotTrack: false, expectTracker: false },
  { name: "rejected", consent: "rejected", doNotTrack: false, expectTracker: false },
  { name: "Do Not Track", consent: "accepted", doNotTrack: true, expectTracker: false },
  { name: "accepted", consent: "accepted", doNotTrack: false, expectTracker: true },
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const trackerRequests = [];

    await page.addInitScript(({ consentKey, consent, doNotTrack }) => {
      localStorage.removeItem(consentKey);
      if (consent) localStorage.setItem(consentKey, consent);
      Object.defineProperty(Navigator.prototype, "doNotTrack", {
        configurable: true,
        get: () => (doNotTrack ? "1" : "0"),
      });
    }, { consentKey, consent: scenario.consent, doNotTrack: scenario.doNotTrack });

    page.on("request", (request) => {
      if (request.url().includes(trackerHost)) trackerRequests.push(request.url());
    });

    const response = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(1_000);

    const installedScripts = await page.locator(`script[src*="${trackerHost}"]`).evaluateAll(
      (scripts) => scripts.map((script) => ({ src: script.src, websiteId: script.dataset.websiteId || null })),
    );

    results.push({
      scenario: scenario.name,
      responseStatus: response?.status() ?? null,
      consent: scenario.consent,
      doNotTrack: scenario.doNotTrack,
      installedScripts,
      trackerRequestCount: trackerRequests.length,
      passed: scenario.expectTracker ? installedScripts.length === 1 : installedScripts.length === 0,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
if (!results.every((result) => result.passed)) process.exitCode = 1;
