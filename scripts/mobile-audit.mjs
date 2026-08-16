import { chromium, webkit, devices } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.MOBILE_AUDIT_URL || "http://127.0.0.1:4173";
const runs = [
  { name: "mobile-chrome", browserType: chromium, device: devices["Pixel 7"] },
  { name: "mobile-safari", browserType: webkit, device: devices["iPhone 14"] },
];

const output = [];

for (const run of runs) {
  const browser = await run.browserType.launch({ headless: true });
  const context = await browser.newContext({ ...run.device, storageState: "./tests/playwright-guest-state.json" });
  const page = await context.newPage();
  const exactWidth = Number(process.env.MOBILE_AUDIT_WIDTH || 0);
  if (exactWidth > 0) {
    await page.setViewportSize({ width: exactWidth, height: 844 });
  }
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of ["/", "/search", "/collections", "/quests"]) {
    await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const snapshot = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const overflowItems = Array.from(document.querySelectorAll("body *"))
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === "string" ? element.className.slice(0, 100) : "",
          right: Math.round(element.getBoundingClientRect().right),
          left: Math.round(element.getBoundingClientRect().left),
          width: Math.round(element.getBoundingClientRect().width),
        }))
        .filter((item) => item.width > 0 && (item.right > viewportWidth + 2 || item.left < -2))
        .sort((a, b) => b.right - a.right)
        .slice(0, 12);
      return {
        url: window.location.pathname,
        title: document.title,
        viewport: { width: viewportWidth, height: window.innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
        inputs: Array.from(document.querySelectorAll("input")).map((input) => ({
          type: input.type,
          inputMode: input.inputMode,
          placeholder: input.getAttribute("placeholder"),
          visible: Boolean(input.offsetWidth || input.offsetHeight || input.getClientRects().length),
        })),
        buttons: Array.from(document.querySelectorAll("button")).slice(0, 30).map((button) => ({
          text: (button.innerText || button.getAttribute("aria-label") || "").trim().slice(0, 80),
          width: Math.round(button.getBoundingClientRect().width),
          height: Math.round(button.getBoundingClientRect().height),
        })),
        overflowItems,
        text: document.body.innerText.slice(0, 700),
      };
    });
    await page.screenshot({ path: `mobile-audit-${run.name}-${route.slice(1) || "home"}.png`, fullPage: true });
    output.push({ browser: run.name, route, snapshot, consoleErrors: [...consoleErrors], pageErrors: [...pageErrors] });
    consoleErrors.length = 0;
    pageErrors.length = 0;
  }

  await browser.close();
}

await fs.writeFile("mobile-audit-report.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
