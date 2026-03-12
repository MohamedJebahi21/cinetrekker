import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const tempDir = path.join(root, ".tmp", "lighthouse");
const reportDir = path.join(root, "lighthouse-desktop-report");
mkdirSync(tempDir, { recursive: true });
mkdirSync(reportDir, { recursive: true });

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function killProcessTree(child) {
  if (!child?.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main() {
  const env = {
    ...process.env,
    TMPDIR: tempDir,
    TMP: tempDir,
    TEMP: tempDir,
  };

  const preview = spawn(
    "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"],
    {
      stdio: "inherit",
      shell: true,
      env,
    },
  );

  let exitCode = 1;

  try {
    const waitCode = await run("npx", ["wait-on", "tcp:4173"], { env });
    if (waitCode !== 0) {
      throw new Error(`wait-on failed with code ${waitCode}`);
    }

    exitCode = await run(
      "npx",
      [
        "lighthouse",
        "http://localhost:4173/",
        "--preset=desktop",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=html",
        "--output=json",
        "--output-path=./lighthouse-desktop-report/report",
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      ],
      { env },
    );

    // Work around known Windows lighthouse temp cleanup EPERM by accepting runs
    // where report artifacts are successfully generated.
    if (exitCode !== 0) {
      const hasHtml = existsSync(path.join(reportDir, "report.report.html"));
      const hasJson = existsSync(path.join(reportDir, "report.report.json"));
      const hasLegacyHtml = existsSync(path.join(reportDir, "report.html"));
      const hasLegacyJson = existsSync(path.join(reportDir, "report.json"));
      if ((hasHtml || hasLegacyHtml) && (hasJson || hasLegacyJson)) {
        console.warn(
          "Lighthouse exited non-zero but reports were generated; continuing.",
        );
        exitCode = 0;
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    exitCode = 1;
  } finally {
    killProcessTree(preview);
  }

  process.exit(exitCode);
}

await main();
