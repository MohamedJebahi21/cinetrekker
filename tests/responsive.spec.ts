import { test, expect } from '@playwright/test';

const viewports = [
  { width: 360, expectedCols: 1 },
  { width: 412, expectedCols: 1 },
  { width: 480, expectedCols: 2 },
  { width: 768, expectedCols: 3 },
  { width: 1024, expectedCols: 5 },
  { width: 1280, expectedCols: 5 },
  { width: 1400, expectedCols: 5 },
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
