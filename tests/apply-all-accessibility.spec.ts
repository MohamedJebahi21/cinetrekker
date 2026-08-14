import { expect, test } from "@playwright/test";

const viewports = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 900 },
];

const routes = [
  "/trending",
  "/discover",
  "/calendar",
  "/settings",
  "/profile",
  "/following",
  "/notifications",
  "/recommendations",
  "/upcoming",
  "/stats",
  "/achievements",
  "/genres",
  "/decades",
  "/awards",
  "/year-in-review",
  "/accessibility",
  "/about",
  "/privacy",
  "/terms",
  "/cookies",
  "/login",
  "/signup",
];

test.describe("Apply All accessibility route sweep", () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${viewport.label} ${route} has accessible structure and no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main").first()).toBeVisible();

        const result = await page.evaluate(() => {
        const visible = (element: Element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        };

        const accessibleName = (element: Element) => {
          const node = element as HTMLElement;
          const ariaLabel = node.getAttribute("aria-label")?.trim();
          const labelledBy = node.getAttribute("aria-labelledby")?.trim();
          const title = node.getAttribute("title")?.trim();
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          const imageAlt = Array.from(node.querySelectorAll("img[alt]"))
            .map((image) => image.getAttribute("alt")?.trim())
            .find(Boolean);
          return ariaLabel || labelledBy || title || text || imageAlt || "";
        };

        const unnamedButtons = Array.from(
          document.querySelectorAll("button, [role='button']"),
        )
          .filter(visible)
          .filter((element) => !accessibleName(element))
          .map((element) => element.outerHTML.slice(0, 180));

        const unnamedLinks = Array.from(document.querySelectorAll("a"))
          .filter(visible)
          .filter((element) => !accessibleName(element))
          .map((element) => element.outerHTML.slice(0, 180));

        const imagesWithoutAlt = Array.from(document.images)
          .filter(visible)
          .filter((image) => !image.hasAttribute("alt"))
          .map((image) => image.outerHTML.slice(0, 180));

        const headings = Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
        )
          .filter(visible)
          .map((heading) => Number(heading.tagName.slice(1)));

        const headingSkips = headings.slice(1).filter((level, index) => {
          return level - headings[index] > 1;
        });

        return {
          horizontalOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          mainCount: document.querySelectorAll("main").length,
          unnamedButtons,
          unnamedLinks,
          imagesWithoutAlt,
          headingSkips,
        };
        });

        expect(result.horizontalOverflow, `${viewport.label} ${route} overflows horizontally`).toBe(
          false,
        );
        expect(result.mainCount, `${viewport.label} ${route} must expose one main landmark`).toBe(1);
        expect(result.unnamedButtons, `${viewport.label} ${route} has unnamed controls`).toEqual([]);
        expect(result.unnamedLinks, `${viewport.label} ${route} has unnamed links`).toEqual([]);
        expect(result.imagesWithoutAlt, `${viewport.label} ${route} has images without alt`).toEqual(
          [],
        );
        expect(result.headingSkips, `${viewport.label} ${route} skips heading levels`).toEqual([]);
      });
    }
  }
});
