import process from "node:process";

import { defineConfig } from "@playwright/test";

const runE2E = process.env.TRADE_DOC_RUN_E2E === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const serverUrl = new URL(baseURL);
const port = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");
if (runE2E && !["127.0.0.1", "localhost"].includes(serverUrl.hostname)) {
  throw new Error("Real E2E is restricted to a local Next server");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  ...(runE2E ? { globalSetup: "./tests/support/global-setup.ts" } : {}),
  ...(runE2E
    ? {
        webServer: {
          command: `pnpm dev --hostname ${serverUrl.hostname} --port ${port}`,
          url: `${serverUrl.origin}/api/health`,
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "ignore",
          stderr: "pipe",
        },
      }
    : {}),
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
});
