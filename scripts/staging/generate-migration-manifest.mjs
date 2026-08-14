import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const migrationDir = path.join(projectRoot, "supabase", "migrations");
const outputPath = path.join(projectRoot, "docs", "staging-migration-manifest.json");

const filenames = (await readdir(migrationDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const seenPrefixes = new Set();
const duplicatePrefixes = new Set();
const migrations = [];

for (const filename of filenames) {
  const prefix = filename.split("_")[0];
  if (seenPrefixes.has(prefix)) duplicatePrefixes.add(prefix);
  seenPrefixes.add(prefix);

  const source = await readFile(path.join(migrationDir, filename));
  migrations.push({
    filename,
    timestampPrefix: prefix,
    sha256: createHash("sha256").update(source).digest("hex"),
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  migrationCount: migrations.length,
  duplicateTimestampPrefixes: [...duplicatePrefixes].sort(),
  migrations,
  note: "Local source manifest only. Compare it with the target project using authorized read-only migration metadata before applying anything.",
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, migrationCount: migrations.length, duplicateTimestampPrefixes: manifest.duplicateTimestampPrefixes }));

if (manifest.duplicateTimestampPrefixes.length > 0) process.exitCode = 1;
