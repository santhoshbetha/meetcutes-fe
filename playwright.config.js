import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "../meetcutes-elixir");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  globalSetup: "./e2e/global-setup.js",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5180",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "mix phx.server",
      cwd: backendDir,
      url: "http://127.0.0.1:4100/api/health",
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        PORT: "4100",
        // Must match the secret used by e2e/stripe-paywall.spec.js to sign
        // the synthetic checkout.session.completed payload.
        STRIPE_WEBHOOK_SECRET: "whsec_e2e_paywall_test",
        INVOICE_STORAGE: "local",
        RATE_LIMIT_ENABLED: "false",
      },
    },
    {
      command:
        "npm run dev -- --mode e2e --host 127.0.0.1 --port 5180 --strictPort",
      cwd: __dirname,
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
