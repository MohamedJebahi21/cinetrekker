import { spawnSync } from "node:child_process";
import { evaluateRuntimeAudit } from "./runtime-audit-policy.mjs";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run the runtime audit through the configured npm script so npm_execpath is available.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error(`Could not run npm audit: ${result.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("npm audit did not return a JSON report.");
  if (result.stderr) console.error(result.stderr.trim());
  if (result.stdout) console.error(result.stdout.trim());
  process.exit(1);
}

if (result.status !== 0 && result.status !== 1) {
  console.error(`npm audit exited unexpectedly with status ${result.status}.`);
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

let evaluation;
try {
  evaluation = evaluateRuntimeAudit(report);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

for (const exception of evaluation.accepted) {
  console.warn(
    `[runtime-audit] Accepted ${exception.packageName} ${exception.advisoryId} through ${exception.expiresAt}: ${exception.reason}`,
  );
}

if (evaluation.blocked.length > 0) {
  console.error("[runtime-audit] Unaccepted high or critical production advisories:");
  for (const finding of evaluation.blocked) {
    console.error(`- ${finding.packageName}: ${finding.severity} (${finding.advisoryIds.join(", ") || "advisory id unavailable"})`);
  }
  process.exit(1);
}

console.log("[runtime-audit] No unaccepted high or critical production advisories.");
