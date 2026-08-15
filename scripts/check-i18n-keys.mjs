import fs from "node:fs";
import path from "node:path";

const strict = process.argv.includes("--strict");
const localesDir = path.resolve("src", "locales");
const sourceDir = path.resolve("src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

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

function collectSourceTranslationKeysWithoutDefaults(directory, acc = new Set()) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (filePath !== localesDir) collectSourceTranslationKeysWithoutDefaults(filePath, acc);
      continue;
    }

    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    const source = fs.readFileSync(filePath, "utf8");
    const matcher = /\bt\s*\(\s*["']([A-Za-z0-9_.-]+)["']\s*\)/gu;
    for (const match of source.matchAll(matcher)) {
      acc.add(match[1]);
    }
  }

  return acc;
}

const enPath = path.join(localesDir, "en.json");
const enKeys = new Set(flattenKeys(readJson(enPath)));
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((name) => name.endsWith(".json") && name !== "en.json")
  .sort();
const sourceKeysWithoutDefaults = collectSourceTranslationKeysWithoutDefaults(sourceDir);
const sourceMissingFromEnglish = [...sourceKeysWithoutDefaults]
  .filter((key) => !enKeys.has(key))
  .sort();

let hasMissing = false;

if (sourceMissingFromEnglish.length > 0) {
  hasMissing = true;
  console.log(
    `- en: ${sourceMissingFromEnglish.length} source keys without explicit defaults missing from English`,
  );
  for (const key of sourceMissingFromEnglish.slice(0, 12)) {
    console.log(`  - ${key}`);
  }
  if (sourceMissingFromEnglish.length > 12) {
    console.log(`  - ... and ${sourceMissingFromEnglish.length - 12} more`);
  }
} else {
  console.log("- en: every source key without an explicit default exists");
}

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
  console.log("All source keys without explicit defaults exist in English and every locale includes every English key.");
} else if (!strict) {
  console.log("Missing keys detected. Run with --strict to return a failing exit code.");
}

if (hasMissing && strict) {
  process.exitCode = 1;
}
