import path from "node:path";
import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: path.resolve(__dirname, ".env.local"), quiet: true });
config({ path: path.resolve(__dirname, ".env"), quiet: true });

const port = process.env.WEB_PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/ar`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
