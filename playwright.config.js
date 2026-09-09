import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 90000,
  expect: { timeout: 30000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5282",
    channel: "chromium",
    headless: true,
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:5282",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
