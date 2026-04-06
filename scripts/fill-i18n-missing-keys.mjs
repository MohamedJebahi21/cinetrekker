import fs from "node:fs";
import path from "node:path";

const localesDir = path.resolve("src", "locales");
const enPath = path.join(localesDir, "en.json");
const writeChanges = !process.argv.includes("--check");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function fillMissingFromTemplate(localeNode, templateNode, prefix = "") {
  if (!isPlainObject(templateNode)) {
    return { node: localeNode, added: 0, paths: [] };
  }

  const output = isPlainObject(localeNode) ? { ...localeNode } : {};
  let added = 0;
  const paths = [];

  for (const [key, templateValue] of Object.entries(templateNode)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    const hasKey = Object.prototype.hasOwnProperty.call(output, key);

    if (isPlainObject(templateValue)) {
      const nested = fillMissingFromTemplate(
        hasKey ? output[key] : undefined,
        templateValue,
        nextPath,
      );
      output[key] = nested.node;
      added += nested.added;
      paths.push(...nested.paths);
      continue;
    }

    if (!hasKey) {
      output[key] = templateValue;
      added += 1;
      paths.push(nextPath);
    }
  }

  return { node: output, added, paths };
}

const template = readJson(enPath);
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((name) => name.endsWith(".json") && name !== "en.json")
  .sort();

let totalAdded = 0;

for (const localeFile of localeFiles) {
  const localePath = path.join(localesDir, localeFile);
  const localeName = localeFile.replace(/\.json$/u, "");
  const localeData = readJson(localePath);
  const { node, added, paths } = fillMissingFromTemplate(localeData, template);

  if (added === 0) {
    console.log(`- ${localeName}: no missing keys to add`);
    continue;
  }

  totalAdded += added;

  if (writeChanges) {
    fs.writeFileSync(localePath, `${JSON.stringify(node, null, 2)}\n`, "utf8");
    console.log(`- ${localeName}: added ${added} keys`);
  } else {
    console.log(`- ${localeName}: would add ${added} keys`);
  }

  for (const key of paths.slice(0, 10)) {
    console.log(`  - ${key}`);
  }
  if (paths.length > 10) {
    console.log(`  - ... and ${paths.length - 10} more`);
  }
}

if (totalAdded === 0) {
  console.log("No missing keys detected in locale files.");
} else if (writeChanges) {
  console.log(`Filled ${totalAdded} missing keys across locale files.`);
} else {
  console.log(`Detected ${totalAdded} missing keys across locale files.`);
  process.exitCode = 1;
}
