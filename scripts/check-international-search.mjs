import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("audit-artifacts/full-e2e-audit-2026-08-18");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "en-US" });
const page = await context.newPage();
await page.goto("https://cinetrekker.vercel.app/search", { waitUntil: "domcontentloaded" });
const pageSearch = page.locator('main form input[inputmode="search"]').first();
const queries = ["yiralti", "yıralti"];
const checks = [];

for (const query of queries) {
  await pageSearch.fill(query);
  await page.waitForTimeout(3500);
  checks.push(await page.evaluate((testedQuery) => {
    const text = (element) => (element.textContent || "").replace(/\s+/g, " ").trim();
    const results = [...document.querySelectorAll('main a[href^="/movie/"], main a[href^="/tv/"]')]
      .map((element) => ({ href: element.getAttribute("href"), text: text(element) }))
      .filter((result) => result.text)
      .slice(0, 10);
    return {
      query: testedQuery,
      url: location.href,
      resultSummary: [...document.querySelectorAll("main h1, main h2, main h3, main p")]
        .map(text)
        .find((value) => value.includes("Results for") || value.includes("No results")) || null,
      topResults: results,
    };
  }, query));
}

await context.close();
await browser.close();
const output = { checks };
await fs.writeFile(path.join(outputDir, "international-search-audit.json"), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
