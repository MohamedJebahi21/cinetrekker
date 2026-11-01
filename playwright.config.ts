import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const edgeExecutable = process.env.PLAYWRIGHT_EDGE_EXECUTABLE ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const configuredChannel = process.env.PLAYWRIGHT_CHANNEL;
const browserChannel = configuredChannel === "chromium"
  ? undefined
  : configuredChannel ?? (isWindows && existsSync(edgeExecutable) ? "msedge" : undefined);
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? resolve(process.env.PLAYWRIGHT_EXECUTABLE_PATH)
  : undefined;
const chromiumOptions = {
  ...(browserChannel ? { channel: browserChannel } : {}),
  ...(executablePath ? { launchOptions: { executablePath } } : {}),
};

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
