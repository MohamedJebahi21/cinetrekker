import { expect, test } from "@playwright/test";

const gridProfiles = [
  { width: 375, height: 667, expectedCols: 2 },
  { width: 390, height: 844, expectedCols: 2 },
  { width: 768, height: 1024, expectedCols: 3 },
  { width: 820, height: 1180, expectedCols: 3 },
  { width: 1024, height: 768, expectedCols: 4 },
];

const deviceProfiles = [
  { name: "phone-375", width: 375, height: 667 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "ipad-768", width: 768, height: 1024 },
  { name: "ipad-820", width: 820, height: 1180 },
  { name: "tablet-landscape", width: 1024, height: 768 },
];

const routeMatrix = [
  { name: "home", path: "/" },
  { name: "watchlist", path: "/watchlist" },
  { name: "details", path: "/movie/550" },
  { name: "profile", path: "/profile" },
  { name: "settings", path: "/settings" },
];

test.describe("Responsive grid system", () => {
  for (const profile of gridProfiles) {
    test(`media-grid uses ${profile.expectedCols} columns at ${profile.width}x${profile.height}`, async ({
      page,
      browserName,
    }) => {
      await page.setViewportSize({
        width: profile.width,
        height: profile.height,
      });
      await page.goto("/");

      const result = await page.evaluate(() => {
        const el = document.createElement("div");
        el.className = "media-grid";
        for (let i = 0; i < 6; i += 1) {
          el.appendChild(document.createElement("div"));
        }
        document.body.appendChild(el);
        const style = getComputedStyle(el);
        const colsValue = style.gridTemplateColumns || "";
        const count = colsValue.trim() ? colsValue.trim().split(/\s+/).length : 0;
        document.body.removeChild(el);
        return { count, colsValue };
      });

      expect(
        result.count,
        `expected ${profile.expectedCols} columns at ${profile.width}px on ${browserName} (gridTemplateColumns='${result.colsValue}')`,
      ).toBe(profile.expectedCols);
    });
  }
});

test.describe("Responsive route shells", () => {
  for (const profile of deviceProfiles) {
    for (const route of routeMatrix) {
      test(`${route.name} stays within viewport on ${profile.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: profile.width,
          height: profile.height,
        });
        await page.goto(route.path, { waitUntil: "domcontentloaded" });

        const result = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          const header = document.querySelector("header");
          const mobileNav = document.querySelector("nav.mobile-nav-safe");
          const firstCard = document.querySelector(
            '[class*="glass-card"], [class*="media-card"], article, a.group',
          );

          const headerRect = header?.getBoundingClientRect() ?? null;
          const mobileNavRect = mobileNav?.getBoundingClientRect() ?? null;
          const cardRect = firstCard?.getBoundingClientRect() ?? null;

          return {
            scrollWidth: Math.max(
              html.scrollWidth,
              body.scrollWidth,
              html.clientWidth,
            ),
            viewportWidth: window.innerWidth,
            headerWithinViewport: headerRect
              ? headerRect.left >= -1 && headerRect.right <= window.innerWidth + 1
              : true,
            mobileNavWithinViewport: mobileNavRect
              ? mobileNavRect.left >= -1 &&
                mobileNavRect.right <= window.innerWidth + 1 &&
                mobileNavRect.bottom <= window.innerHeight + 1
              : true,
            cardWithinViewport: cardRect
              ? cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1
              : true,
          };
        });

        expect(
          result.scrollWidth,
          `${route.name} overflowed horizontally on ${profile.name}`,
        ).toBeLessThanOrEqual(result.viewportWidth + 1);
        expect(
          result.headerWithinViewport,
          `${route.name} header overflowed on ${profile.name}`,
        ).toBe(true);
        expect(
          result.mobileNavWithinViewport,
          `${route.name} mobile nav overflowed on ${profile.name}`,
        ).toBe(true);
        expect(
          result.cardWithinViewport,
          `${route.name} card layout overflowed on ${profile.name}`,
        ).toBe(true);
      });
    }
  }
});

test.describe("Safe-area footer behavior", () => {
  test("mobile-nav-safe stays within portrait viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const result = await page.evaluate(() => {
      const footer = document.createElement("div");
      footer.className = "mobile-nav-safe";
      footer.style.position = "fixed";
      footer.style.left = "0";
      footer.style.right = "0";
      footer.style.bottom = "0";
      footer.style.height = "56px";
      footer.style.zIndex = "9999";
      document.body.appendChild(footer);

      const rect = footer.getBoundingClientRect();
      const style = getComputedStyle(footer);
      const paddingBottom = style.paddingBottom;
      const isWithinViewport = rect.bottom <= window.innerHeight + 0.5;

      document.body.removeChild(footer);
      return { isWithinViewport, paddingBottom };
    });

    expect(result.isWithinViewport).toBe(true);
    expect(result.paddingBottom).not.toBe("");
  });

  test("mobile-nav-safe stays within landscape viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");

    const result = await page.evaluate(() => {
      const footer = document.createElement("div");
      footer.className = "mobile-nav-safe";
      footer.style.position = "fixed";
      footer.style.left = "0";
      footer.style.right = "0";
      footer.style.bottom = "0";
      footer.style.height = "56px";
      footer.style.zIndex = "9999";
      document.body.appendChild(footer);

      const rect = footer.getBoundingClientRect();
      document.body.removeChild(footer);

      return { isWithinViewport: rect.bottom <= window.innerHeight + 0.5 };
    });

    expect(result.isWithinViewport).toBe(true);
  });
});
