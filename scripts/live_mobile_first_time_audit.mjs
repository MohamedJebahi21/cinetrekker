import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const baseUrl = "https://cinetrekker.vercel.app";
const routes = ["/", "/search", "/trending", "/watchlist", "/signup"];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  deviceScaleFactor: 2,
});
const results = [];

for (const route of routes) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${route}?mobile_first_time_audit=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const name = (element) => {
      const aria = element.getAttribute("aria-label")?.trim();
      const title = element.getAttribute("title")?.trim();
      const text = element.textContent?.replace(/\s+/g, " ").trim();
      const imageAlt = [...element.querySelectorAll("img[alt]")]
        .map((image) => image.getAttribute("alt")?.trim())
        .find(Boolean);
      return aria || title || text || imageAlt || "";
    };
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    return {
      route: location.pathname,
      title: document.title,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      mainCount: document.querySelectorAll("main").length,
      unnamedButtons: [...document.querySelectorAll("button, [role='button']")].filter(visible).filter((el) => !name(el)).length,
      unnamedButtonMarkup: [...document.querySelectorAll("button, [role='button']")].filter(visible).filter((el) => !name(el)).map((el) => el.outerHTML.slice(0, 240)),
      unnamedLinks: [...document.querySelectorAll("a")].filter(visible).filter((el) => !name(el)).length,
      hasWelcomeModal: /Welcome to CineTrekker/.test(text),
      hasCookieBanner: /Cookie preferences/.test(text),
      hasDataError: /couldn't load|unavailable|no results found|request was rejected/i.test(text),
      errorExcerpt: (text.match(/.{0,40}(couldn't load|unavailable|no results found|request was rejected).{0,100}/i) || [""])[0],
    };
  });
  results.push(result);
  await page.close();
}

await browser.close();
await writeFile("/tmp/live_mobile_first_time_audit.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
