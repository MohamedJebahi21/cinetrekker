import { chromium, webkit, devices } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.MOBILE_AUDIT_URL || "http://localhost:8080";
const runs = [
  { name: "mobile-safari", browserType: webkit, device: devices["iPhone 14"] },
];

const routes = [
  "/",
  "/search",
  "/trending",
  "/discover",
  "/watchlist",
  "/watched",
  "/notifications",
  "/profile",
  "/collections",
  "/quests",
  "/settings",
  "/movie/fight-club-550",
  "/tv/the-sopranos-1399",
  "/login",
  "/signup"
];

const output = [];

for (const run of runs) {
  console.log(`Starting audit for ${run.name}...`);
  const browser = await run.browserType.launch({ headless: true });
  const context = await browser.newContext({ 
    ...run.device,
    // We use guest state or mock auth if needed, but for audit we check layout primarily
    viewport: { width: 390, height: 844 }
  });
  
  const page = await context.newPage();
  
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of routes) {
    console.log(`Auditing ${route}...`);
    try {
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle", timeout: 30000 });
      
      // Wait for any initial animations
      await page.waitForTimeout(1000);
      
      // Scroll to the bottom to trigger lazy loading and check for scroll issues
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      // Scroll back to top for the final check
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const snapshot = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Detect horizontal overflow
        const overflowItems = Array.from(document.querySelectorAll("body *"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id,
              className: typeof element.className === "string" ? element.className.slice(0, 100) : "",
              right: Math.round(rect.right),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
          .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
          .sort((a, b) => b.right - a.right)
          .slice(0, 10);

        // Check for overlapping elements (simplified)
        // This is hard to do generically but we can check if fixed elements are blocking each other
        const fixedElements = Array.from(document.querySelectorAll("*"))
          .filter(el => window.getComputedStyle(el).position === 'fixed')
          .map(el => {
            const rect = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase(),
              rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
            };
          });

        return {
          url: window.location.pathname,
          title: document.title,
          viewport: { width: viewportWidth, height: viewportHeight },
          documentWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
          overflowItems,
          fixedElements,
          textLength: document.body.innerText.length,
          links: document.querySelectorAll("a").length,
          buttons: document.querySelectorAll("button").length,
        };
      });

      const safeRouteName = route.replace(/\//g, "-").replace(/^-/, "") || "home";
      const screenshotPath = `audit-${run.name}-${safeRouteName}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      output.push({ 
        browser: run.name, 
        route, 
        snapshot, 
        screenshot: screenshotPath,
        consoleErrors: [...consoleErrors], 
        pageErrors: [...pageErrors] 
      });
      
      consoleErrors.length = 0;
      pageErrors.length = 0;
    } catch (err) {
      console.error(`Failed to audit ${route}: ${err.message}`);
      output.push({ route, error: err.message });
    }
  }

  await browser.close();
}

await fs.writeFile("comprehensive-mobile-audit-report.json", JSON.stringify(output, null, 2));
console.log("Audit complete. Report saved to comprehensive-mobile-audit-report.json");
