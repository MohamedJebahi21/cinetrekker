import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const distAssetsDir = join(process.cwd(), "dist", "assets");

const MAX_ENTRY_CHUNK_BYTES = Number(process.env.BUNDLE_BUDGET_ENTRY_BYTES ?? 560_000);
const MAX_CHUNK_BYTES = Number(process.env.BUNDLE_BUDGET_CHUNK_BYTES ?? 560_000);
const MAX_TOTAL_JS_BYTES = Number(process.env.BUNDLE_BUDGET_TOTAL_JS_BYTES ?? 3_200_000);
const MAX_ENTRY_GZIP_BYTES = Number(process.env.BUNDLE_BUDGET_ENTRY_GZIP_BYTES ?? 180_000);

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

if (!existsSync(distAssetsDir)) {
  console.error("Bundle budget check failed: dist/assets not found. Run npm run build first.");
  process.exit(1);
}

const files = readdirSync(distAssetsDir);
const jsFiles = files
  .filter((name) => name.endsWith(".js"))
  .map((name) => {
    const fullPath = join(distAssetsDir, name);
    return {
      name,
      path: fullPath,
      size: statSync(fullPath).size,
      gzipSize: gzipSync(readFileSync(fullPath)).length,
    };
  })
  .sort((a, b) => b.size - a.size);

if (jsFiles.length === 0) {
  console.error("Bundle budget check failed: no JavaScript bundles found in dist/assets.");
  process.exit(1);
}

const entryChunk =
  jsFiles.find((file) => /^index-.*\.js$/i.test(file.name)) ?? jsFiles[0];
const totalJsBytes = jsFiles.reduce((sum, file) => sum + file.size, 0);
const oversizedChunks = jsFiles.filter((file) => file.size > MAX_CHUNK_BYTES);

const failures = [];
if (entryChunk.size > MAX_ENTRY_CHUNK_BYTES) {
  failures.push(
    `Entry chunk ${entryChunk.name} is ${formatBytes(entryChunk.size)} (limit ${formatBytes(MAX_ENTRY_CHUNK_BYTES)}).`,
  );
}
if (entryChunk.gzipSize > MAX_ENTRY_GZIP_BYTES) {
  failures.push(
    `Entry chunk gzip size ${formatBytes(entryChunk.gzipSize)} exceeds limit ${formatBytes(MAX_ENTRY_GZIP_BYTES)}.`,
  );
}
if (totalJsBytes > MAX_TOTAL_JS_BYTES) {
  failures.push(
    `Total JavaScript bundle size is ${formatBytes(totalJsBytes)} (limit ${formatBytes(MAX_TOTAL_JS_BYTES)}).`,
  );
}
if (oversizedChunks.length > 0) {
  failures.push(
    `Oversized chunks: ${oversizedChunks
      .map((chunk) => `${chunk.name}=${formatBytes(chunk.size)}`)
      .join(", ")}`,
  );
}

console.log("Bundle budget report:");
console.log(`- Entry chunk: ${entryChunk.name} (${formatBytes(entryChunk.size)}, gzip ${formatBytes(entryChunk.gzipSize)})`);
console.log(`- Total JS size: ${formatBytes(totalJsBytes)}`);
console.log(`- Largest 5 chunks: ${jsFiles.slice(0, 5).map((file) => `${file.name}=${formatBytes(file.size)}`).join(", ")}`);

if (failures.length > 0) {
  console.error("Bundle budget check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Bundle budget check passed.");