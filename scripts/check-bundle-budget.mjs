import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const entryHtml = path.join(dist, "index.html");
const MAX_INITIAL_JS_BYTES = 1_550_000;
const MAX_ENTRY_BYTES = 420_000;

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

if (!fs.existsSync(entryHtml)) {
  throw new Error("Build output is missing. Run `vite build` before checking bundle budgets.");
}

const html = fs.readFileSync(entryHtml, "utf8");
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g)]
  .map((match) => match[1])
  .filter((asset, index, list) => list.indexOf(asset) === index);

if (assets.length === 0) {
  throw new Error("No JavaScript entry or preload assets were found in dist/index.html.");
}

const measurements = assets.map((asset) => {
  const relative = asset.replace(/^\//, "");
  const file = path.join(dist, relative);
  if (!fs.existsSync(file)) {
    throw new Error(`Referenced bootstrap asset is missing: ${asset}`);
  }
  return { asset, bytes: fs.statSync(file).size };
});

const initialBytes = measurements.reduce((sum, item) => sum + item.bytes, 0);
const entry = measurements.find((item) => /\/assets\/index-[^/]+\.js$/.test(item.asset));

console.log("Initial JavaScript budget");
for (const item of measurements) {
  console.log(`  ${formatBytes(item.bytes).padStart(11)}  ${item.asset}`);
}
console.log(`  ${formatBytes(initialBytes).padStart(11)}  total preload graph`);

const failures = [];
if (initialBytes > MAX_INITIAL_JS_BYTES) {
  failures.push(
    `Initial preload graph is ${formatBytes(initialBytes)}; budget is ${formatBytes(MAX_INITIAL_JS_BYTES)}.`,
  );
}
if (entry && entry.bytes > MAX_ENTRY_BYTES) {
  failures.push(
    `Application entry is ${formatBytes(entry.bytes)}; budget is ${formatBytes(MAX_ENTRY_BYTES)}.`,
  );
}

if (failures.length > 0) {
  throw new Error(`Bundle budget exceeded:\n${failures.join("\n")}`);
}
