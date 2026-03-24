import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const tempDir = path.join(root, ".tmp", "lighthouse");
const reportDir = path.join(root, "lighthouse-desktop-report");
const PREVIEW_START_TIMEOUT_MS = 45_000;
const LIGHTHOUSE_TIMEOUT_MS = 180_000;
mkdirSync(tempDir, { recursive: true });
mkdirSync(reportDir, { recursive: true });

const isWindows = process.platform === "win32";

function toWindowsCommand(command, args) {
  const escaped = [command, ...args]
    .map((part) => {
      if (/^[A-Za-z0-9_./:-]+$/.test(part)) {
        return part;
      }
      return `"${part.replaceAll('"', '\\"')}"`;
    })
    .join(" ");
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", escaped],
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeoutMs = 0, env } = options;
    const spawnConfig = isWindows
      ? toWindowsCommand(command, args)
      : { command, args };

    const commandLabel = `${command} ${args.join(" ")}`;
    const startedAt = Date.now();
    let timedOut = false;

    const child = spawn(spawnConfig.command, spawnConfig.args, {
      stdio: "inherit",
      env,
    });

    let timer;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        console.error(`Command timed out after ${timeoutMs}ms: ${commandLabel}`);
        killProcessTree(child);
      }, timeoutMs);
    }

    console.log(`> ${commandLabel}`);

    child.on("error", reject);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      const elapsedMs = Date.now() - startedAt;

      if (timedOut) {
        reject(new Error(`Timed out: ${commandLabel}`));
        return;
      }

      console.log(`< ${commandLabel} (code ${code ?? 1}, ${elapsedMs}ms)`);
      resolve(code ?? 1);
    });
  });
}

function killProcessTree(child) {
  if (!child?.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function reserveAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to reserve a preview port.")));
        return;
      }

      const { port } = address;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
  });
}

function startPreview(env, port) {
  const previewSpawnConfig = isWindows
    ? toWindowsCommand("npm", [
        "run",
        "preview",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ])
    : {
        command: "npm",
        args: [
          "run",
          "preview",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
        ],
      };

  return spawn(previewSpawnConfig.command, previewSpawnConfig.args, {
    stdio: "inherit",
    env,
  });
}

function reportArtifactsSummary() {
  const htmlPath = path.join(reportDir, "report.report.html");
  const jsonPath = path.join(reportDir, "report.report.json");
  const hasHtml = existsSync(htmlPath) || existsSync(path.join(reportDir, "report.html"));
  const hasJson = existsSync(jsonPath) || existsSync(path.join(reportDir, "report.json"));

  console.log(
    `Lighthouse artifacts: html=${hasHtml ? "yes" : "no"}, json=${hasJson ? "yes" : "no"}`,
  );
}

async function main() {
  const env = {
    ...process.env,
    TMPDIR: tempDir,
    TMP: tempDir,
    TEMP: tempDir,
  };

  let preview;
  let port;

  let exitCode = 1;

  try {
    console.log("Starting desktop Lighthouse audit...");
    port = await reserveAvailablePort();
    preview = startPreview(env, port);
    console.log(`Reserved preview port: ${port}`);

    preview.on("error", (error) => {
      console.error(error instanceof Error ? error.message : String(error));
    });
    preview.on("close", (code) => {
      if (exitCode === 1) return;
      if (code !== null && code !== 0) {
        console.warn(`Preview process exited with code ${code}.`);
      }
    });

    const waitCode = await run(
      "npx",
      ["wait-on", `tcp:127.0.0.1:${port}`],
      { env, timeoutMs: PREVIEW_START_TIMEOUT_MS },
    );
    if (waitCode !== 0) {
      throw new Error(`wait-on failed with code ${waitCode}`);
    }

    exitCode = await run(
      "npx",
      [
        "lighthouse",
        `http://127.0.0.1:${port}/`,
        "--preset=desktop",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=html",
        "--output=json",
        "--output-path=./lighthouse-desktop-report/report",
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      ],
      { env, timeoutMs: LIGHTHOUSE_TIMEOUT_MS },
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

    reportArtifactsSummary();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    reportArtifactsSummary();
    exitCode = 1;
  } finally {
    if (preview) {
      killProcessTree(preview);
    }
  }

  process.exit(exitCode);
}

await main();
