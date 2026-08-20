import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), 'utf8');

const requiredOledTokens = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--border',
  '--input',
  '--ring',
  '--glass-bg',
  '--glass-border',
  '--shadow-card',
  '--shadow-card-hover',
  '--ct-gradient-shell',
];

test('OLED mode defines the full semantic token contract', async () => {
  const css = await readProjectFile('src/index.css');
  const oledStart = css.indexOf('[data-theme="oled"] {');
  const oledEnd = css.indexOf('\n  }', oledStart);
  const oledBlock = css.slice(oledStart, oledEnd);

  assert.notEqual(oledStart, -1, 'OLED selector must exist');
  for (const token of requiredOledTokens) {
    assert.match(oledBlock, new RegExp(`${token}:`), `OLED mode must define ${token}`);
  }
  assert.match(oledBlock, /--ct-gradient-shell:\s*linear-gradient\(180deg, #000, #050505\)/);
});

test('theme tokens are defined once and the premium layer does not override them', async () => {
  const css = await readProjectFile('src/index.css');
  const premiumLayer = css.slice(
    css.indexOf('CineTrekker premium product layer'),
    css.indexOf('html { background: hsl(var(--background)); }'),
  );

  assert.doesNotMatch(premiumLayer, /\n:root\s*\{/);
  assert.doesNotMatch(premiumLayer, /\n\.dark\s*\{/);
  assert.doesNotMatch(premiumLayer, /\n\[data-theme="oled"\]\s*\{/);
});

test('the document head uses a CSP-compatible pre-paint bootstrap', async () => {
  const [html, bootstrap] = await Promise.all([
    readProjectFile('index.html'),
    readProjectFile('public/theme-bootstrap.js'),
  ]);

  assert.match(html, /<script src="\/theme-bootstrap\.js"><\/script>/);
  assert.match(bootstrap, /cinetrekker-theme/);
  assert.match(bootstrap, /root\.classList\.toggle\("dark", theme !== "light"\)/);
  assert.match(bootstrap, /root\.style\.colorScheme/);
});
