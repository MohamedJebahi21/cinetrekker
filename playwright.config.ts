import { chromium, defineConfig, devices } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

function findInstalledChromiumBrowser() {
  const candidates = process.platform === "win32"
    ? [
        process.env.PLAYWRIGHT_EDGE_EXECUTABLE,
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      ]
    : process.platform === "darwin"
      ? [
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        ]
      : [
          "/usr/bin/microsoft-edge",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/usr/bin/brave-browser",
        ];

  return candidates.find((candidate) => candidate && isLaunchableBrowser(candidate));
}

function isLaunchableBrowser(executablePath: string) {
  if (!existsSync(executablePath)) return false;
  const result = spawnSync(executablePath, ["--version"], {
    timeout: 5000,
    windowsHide: true,
    stdio: "ignore",
  });
  return result.status === 0;
}

function resolveChromiumOptions() {
  const configuredChannel = process.env.PLAYWRIGHT_CHANNEL;
  if (configuredChannel && configuredChannel !== "chromium") {
    return { channel: configuredChannel };
  }

  const configuredExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  if (configuredExecutable) {
    return { launchOptions: { executablePath: resolve(configuredExecutable) } };
  }

  const bundledExecutable = chromium.executablePath();
  if (isLaunchableBrowser(bundledExecutable)) return {};

  const installedExecutable = findInstalledChromiumBrowser();
  return installedExecutable
    ? { launchOptions: { executablePath: installedExecutable } }
    : {};
}

const chromiumOptions = resolveChromiumOptions();

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
    storageState: "./tests/playwright-guest-state.json",
    serviceWorkers: "block",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumOptions,
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        ...chromiumOptions,
      },
    },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
