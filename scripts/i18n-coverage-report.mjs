import fs from "node:fs";
import path from "node:path";

const localesDir = path.resolve("src", "locales");
const outputPath = process.argv[2] ?? path.resolve("i18n-coverage-report.md");

function flattenKeys(value, prefix = "", acc = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return acc;
  }

  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenKeys(child, next, acc);
    } else {
      acc.push(next);
    }
  }

  return acc;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatLocaleName(localeFile) {
  return localeFile.replace(/\.json$/u, "");
}

const enPath = path.join(localesDir, "en.json");
const enKeys = new Set(flattenKeys(readJson(enPath)));
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((name) => name.endsWith(".json") && name !== "en.json")
  .sort();

const lines = [
  "# i18n Coverage Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `English key count: ${enKeys.size}`,
  "",
  "| Locale | Key Count | Missing | Status |",
  "| --- | ---: | ---: | --- |",
];

let totalMissing = 0;

for (const localeFile of localeFiles) {
  const localeName = formatLocaleName(localeFile);
  const localeKeys = new Set(
    flattenKeys(readJson(path.join(localesDir, localeFile))),
  );
  const missing = [...enKeys].filter((key) => !localeKeys.has(key));
  totalMissing += missing.length;
  const status = missing.length === 0 ? "Pass" : "Needs work";

  lines.push(
    `| ${localeName} | ${localeKeys.size} | ${missing.length} | ${status} |`,
  );
}

lines.push("", `Total missing keys across locales: ${totalMissing}`, "");

if (totalMissing === 0) {
  lines.push(
    "All locale files match the English key set. The coverage guard is green.",
  );
} else {
  lines.push(
    "Some locale files are missing keys. See the per-locale counts above.",
  );
}

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote i18n coverage report to ${outputPath}`);
