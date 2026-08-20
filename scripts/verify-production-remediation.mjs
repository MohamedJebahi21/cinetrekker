import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = "https://cinetrekker.vercel.app";
const outputPath = path.resolve("audit-artifacts/full-e2e-audit-2026-08-18/production-remediation-verification.json");
const browser = await chromium.launch({ headless: true });

async function measureLayout(pathname) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "en-US",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__ctLayoutVerification = { totalCls: 0, shifts: [], lcp: null };
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__ctLayoutVerification.totalCls += entry.value;
        window.__ctLayoutVerification.shifts.push({
          value: entry.value,
          startTime: entry.startTime,
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const entry = entries[entries.length - 1];
      if (!entry) return;
      window.__ctLayoutVerification.lcp = {
        startTime: entry.startTime,
        size: entry.size,
        element: entry.element?.tagName || null,
        source: entry.url || entry.element?.getAttribute?.("src") || null,
      };
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const result = await page.evaluate(() => ({
    url: location.href,
    totalCls: window.__ctLayoutVerification?.totalCls ?? null,
    shifts: window.__ctLayoutVerification?.shifts ?? [],
    lcp: window.__ctLayoutVerification?.lcp ?? null,
    visibleHeading: document.querySelector("main h1, main h2")?.textContent?.trim() || null,
    heroBusy: document.querySelector('[aria-busy="true"][aria-label*="Loading"]') !== null,
  }));
  await context.close();
  return result;
}

async function inspectPersonSchema() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "en-US" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/person/tom-holland-1136406`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6500);
  const result = await page.evaluate(() => {
    const jsonLdTypes = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((node) => {
        try {
          const parsed = JSON.parse(node.textContent || "null");
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      })
      .flatMap((entry) => Array.isArray(entry?.["@graph"]) ? entry["@graph"] : [entry])
      .map((entry) => entry?.["@type"])
      .filter(Boolean);
    return { url: location.href, jsonLdTypes };
  });
  await context.close();
  return result;
}

const output = {
  checkedAt: new Date().toISOString(),
  home: await measureLayout("/"),
  discover: await measureLayout("/discover"),
  person: await inspectPersonSchema(),
};

await browser.close();
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
