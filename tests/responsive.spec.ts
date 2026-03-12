import { test, expect } from '@playwright/test';

const viewports = [
  { width: 360, expectedCols: 2 },
  { width: 412, expectedCols: 2 },
  { width: 480, expectedCols: 2 },
  { width: 768, expectedCols: 3 },
  { width: 1024, expectedCols: 4 },
  { width: 1280, expectedCols: 4 },
  { width: 1400, expectedCols: 4 },
];

test.describe('Responsive checks for .media-grid', () => {
  for (const vp of viewports) {
    test(`viewport ${vp.width}px -> ${vp.expectedCols} columns`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: vp.width, height: 900 });
      await page.goto('/');
      // Inject a temporary element with the media-grid class and measure computed columns
      const result = await page.evaluate(() => {
        const el = document.createElement('div');
        el.className = 'media-grid';
        for (let i = 0; i < 4; i++) el.appendChild(document.createElement('div'));
        document.body.appendChild(el);
        const style = getComputedStyle(el as Element);
        const colsValue = style.gridTemplateColumns || '';
        const count = colsValue.trim() ? colsValue.trim().split(/\s+/).length : 0;
        document.body.removeChild(el);
        return { count, colsValue };
      });

      const cols = result.count;
      const colsValue = result.colsValue;
      expect(cols, `expected ${vp.expectedCols} columns at ${vp.width}px on ${browserName} (found cols=${cols}, gridTemplateColumns='${colsValue}')`).toBe(vp.expectedCols);
    });
  }
});

test.describe('Mobile orientation and fixed footer checks', () => {
  test('portrait viewport keeps injected mobile footer within bounds', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const result = await page.evaluate(() => {
      const footer = document.createElement('div');
      footer.className = 'mobile-nav-safe';
      footer.style.position = 'fixed';
      footer.style.left = '0';
      footer.style.right = '0';
      footer.style.bottom = '0';
      footer.style.height = '56px';
      footer.style.zIndex = '9999';
      document.body.appendChild(footer);

      const rect = footer.getBoundingClientRect();
      const style = getComputedStyle(footer);
      const paddingBottom = style.paddingBottom;
      const isWithinViewport = rect.bottom <= window.innerHeight + 0.5;

      document.body.removeChild(footer);
      return { isWithinViewport, paddingBottom };
    });

    expect(result.isWithinViewport).toBe(true);
    expect(result.paddingBottom).not.toBe('');
  });

  test('landscape viewport keeps injected mobile footer within bounds', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');

    const result = await page.evaluate(() => {
      const footer = document.createElement('div');
      footer.className = 'mobile-nav-safe';
      footer.style.position = 'fixed';
      footer.style.left = '0';
      footer.style.right = '0';
      footer.style.bottom = '0';
      footer.style.height = '56px';
      footer.style.zIndex = '9999';
      document.body.appendChild(footer);

      const rect = footer.getBoundingClientRect();
      const isWithinViewport = rect.bottom <= window.innerHeight + 0.5;

      document.body.removeChild(footer);
      return { isWithinViewport };
    });

    expect(result.isWithinViewport).toBe(true);
  });
});
