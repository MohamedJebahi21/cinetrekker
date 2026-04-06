import fs from "node:fs";
import path from "node:path";

const strict = process.argv.includes("--strict");
const localesDir = path.resolve("src", "locales");

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

const enPath = path.join(localesDir, "en.json");
const enKeys = new Set(flattenKeys(readJson(enPath)));
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((name) => name.endsWith(".json") && name !== "en.json")
  .sort();

let hasMissing = false;

for (const localeFile of localeFiles) {
  const localeName = localeFile.replace(/\.json$/u, "");
  const localeKeys = new Set(
    flattenKeys(readJson(path.join(localesDir, localeFile))),
  );
  const missing = [...enKeys].filter((key) => !localeKeys.has(key));

  if (missing.length > 0) {
    hasMissing = true;
    console.log(`- ${localeName}: ${missing.length} missing keys`);
    for (const key of missing.slice(0, 12)) {
      console.log(`  - ${key}`);
    }
    if (missing.length > 12) {
      console.log(`  - ... and ${missing.length - 12} more`);
    }
  } else {
    console.log(`- ${localeName}: no missing keys`);
  }
}

if (!hasMissing) {
  console.log("All locale files include every English key.");
} else if (!strict) {
  console.log("Missing keys detected. Run with --strict to return a failing exit code.");
}

if (hasMissing && strict) {
  process.exitCode = 1;
}
