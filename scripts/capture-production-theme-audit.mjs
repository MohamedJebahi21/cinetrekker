import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const outputDir = process.env.THEME_AUDIT_DIR ?? "/home/ubuntu/theme-audit-baseline";
const targetUrl = process.env.THEME_AUDIT_URL ?? "https://cinetrekker.vercel.app/";
const themes = ["light", "dark", "oled"];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.addInitScript(({ theme }) => {
      localStorage.setItem("cinetrekker-theme", theme);
      localStorage.setItem("cinetrekker_cookie_consent", "rejected");
    }, { theme });

    const response = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(600);
    const computed = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const panel = document.querySelector(".ct-panel");
      return {
        dataTheme: root.dataset.theme,
        darkClass: root.classList.contains("dark"),
        bodyBackground: getComputedStyle(body).backgroundColor,
        bodyColor: getComputedStyle(body).color,
        panelBackground: panel ? getComputedStyle(panel).backgroundColor : null,
        panelBorder: panel ? getComputedStyle(panel).borderColor : null,
      };
    });
    await page.screenshot({ path: `${outputDir}/home-${theme}.png`, fullPage: false });
    results.push({ theme, status: response?.status() ?? null, computed });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
