import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const tempDir = path.join(root, ".tmp", "lighthouse");
const reportDir = path.join(root, "lighthouse-desktop-report");
const latestReportBase = path.join(reportDir, "report");
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
    const { timeoutMs = 0, env, captureOutput = false } = options;
    const spawnConfig = isWindows
      ? toWindowsCommand(command, args)
      : { command, args };

    const commandLabel = `${command} ${args.join(" ")}`;
    const startedAt = Date.now();
    let timedOut = false;

    const child = spawn(spawnConfig.command, spawnConfig.args, {
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      env,
    });
    let stdout = "";
    let stderr = "";

    if (captureOutput) {
      child.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        process.stdout.write(text);
      });
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        process.stderr.write(text);
      });
    }

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
      if (captureOutput) {
        resolve({
          code: code ?? 1,
          stdout,
          stderr,
        });
        return;
      }

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
  const htmlPath = `${latestReportBase}.report.html`;
  const jsonPath = `${latestReportBase}.report.json`;
  const hasHtml = existsSync(htmlPath) || existsSync(path.join(reportDir, "report.html"));
  const hasJson = existsSync(jsonPath) || existsSync(path.join(reportDir, "report.json"));

  console.log(
    `Lighthouse artifacts: html=${hasHtml ? "yes" : "no"}, json=${hasJson ? "yes" : "no"}`,
  );
}

function safeRemove(filePath) {
  try {
    rmSync(filePath, { force: true });
  } catch {
    // Ignore stale artifact cleanup issues and let the fresh run proceed.
  }
}

function clearLatestArtifacts() {
  [
    `${latestReportBase}.report.html`,
    `${latestReportBase}.report.json`,
    path.join(reportDir, "report.html"),
    path.join(reportDir, "report.json"),
    path.join(reportDir, "latest-run.json"),
  ].forEach(safeRemove);
}

function findLatestDefaultHtmlReport(minMtimeMs = 0) {
  const candidate = readdirSync(root)
    .filter((name) => /^127\.0\.0\.1_.*\.report\.html$/i.test(name))
    .map((name) => {
      const filePath = path.join(root, name);
      const stats = statSync(filePath);
      return { filePath, mtimeMs: stats.mtimeMs };
    })
    .filter((entry) => entry.mtimeMs >= minMtimeMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

  return candidate?.filePath ?? null;
}

function getGeneratedArtifactPaths(runBase) {
  const runHtml = `${runBase}.report.html`;
  const runJson = `${runBase}.report.json`;
  const legacyHtml = path.join(reportDir, "report.html");
  const legacyJson = path.join(reportDir, "report.json");

  return {
    html: existsSync(runHtml) ? runHtml : legacyHtml,
    json: existsSync(runJson) ? runJson : legacyJson,
  };
}

function extractJsonFromHtmlReport(htmlPath, jsonPath) {
  if (!existsSync(htmlPath)) {
    return false;
  }

  const html = readFileSync(htmlPath, "utf8");
  const match = html.match(/window\.__LIGHTHOUSE_JSON__ = (.*?);<\/script>/s);
  if (!match?.[1]) {
    return false;
  }

  const parsed = JSON.parse(match[1]);
  writeFileSync(jsonPath, `${JSON.stringify(parsed, null, 2)}\n`);
  return true;
}

function publishLatestArtifacts(runBase, metadata) {
  const { html, json } = getGeneratedArtifactPaths(runBase);
  if (!existsSync(html) || !existsSync(json)) {
    return false;
  }

  copyFileSync(html, `${latestReportBase}.report.html`);
  copyFileSync(json, `${latestReportBase}.report.json`);

  const htmlStat = statSync(`${latestReportBase}.report.html`);
  const jsonStat = statSync(`${latestReportBase}.report.json`);

  writeFileSync(
    path.join(reportDir, "latest-run.json"),
    JSON.stringify(
      {
        ...metadata,
        latestHtml: path.relative(root, `${latestReportBase}.report.html`),
        latestJson: path.relative(root, `${latestReportBase}.report.json`),
        htmlMtime: htmlStat.mtime.toISOString(),
        jsonMtime: jsonStat.mtime.toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`Latest Lighthouse HTML: ${path.relative(root, `${latestReportBase}.report.html`)}`);
  console.log(`Latest Lighthouse JSON: ${path.relative(root, `${latestReportBase}.report.json`)}`);
  console.log(`Latest Lighthouse JSON mtime: ${jsonStat.mtime.toISOString()}`);
  return true;
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
  const runId = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const runBase = path.join(reportDir, `report-${runId}`);
  let exitCode = 1;

  try {
    console.log("Starting desktop Lighthouse audit...");
    clearLatestArtifacts();
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

    const lighthouseStartedAt = Date.now();
    exitCode = await run(
      "npx",
      [
        "lighthouse",
        `http://127.0.0.1:${port}/`,
        "--preset=desktop",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=html",
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      ],
      { env, timeoutMs: LIGHTHOUSE_TIMEOUT_MS },
    );

    const defaultHtmlReport = findLatestDefaultHtmlReport(lighthouseStartedAt);
    if (defaultHtmlReport) {
      copyFileSync(defaultHtmlReport, `${runBase}.report.html`);
      extractJsonFromHtmlReport(`${runBase}.report.html`, `${runBase}.report.json`);
      safeRemove(defaultHtmlReport);
    }

    // Work around known Windows lighthouse temp cleanup EPERM by accepting runs
    // where report artifacts are successfully generated.
    if (exitCode !== 0) {
      const generatedArtifacts = getGeneratedArtifactPaths(runBase);
      if (
        existsSync(generatedArtifacts.html) &&
        existsSync(generatedArtifacts.json)
      ) {
        console.warn(
          "Lighthouse exited non-zero but reports were generated; continuing.",
        );
        exitCode = 0;
      }
    }

    publishLatestArtifacts(runBase, {
      runId,
      port,
      requestedUrl: `http://127.0.0.1:${port}/`,
      generatedHtml: path.relative(root, `${runBase}.report.html`),
      generatedJson: path.relative(root, `${runBase}.report.json`),
      completedAt: new Date().toISOString(),
    });
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
