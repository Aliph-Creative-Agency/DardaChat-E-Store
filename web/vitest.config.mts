import path from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, ".env.local"), quiet: true });
config({ path: path.resolve(__dirname, ".env"), quiet: true });

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  `postgres://postgres:postgres@localhost:${process.env.PG_PORT ?? 54320}/dardachat_test`;

const resolve = {
  alias: {
    "@": path.resolve(__dirname, "src"),
    // `server-only` throws outside React Server Components; tests run app code in plain Node.
    "server-only": path.resolve(__dirname, "src/test/empty-module.ts"),
  },
};

export default defineConfig({
  resolve,
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["src/**/*.int.test.ts", "node_modules/**"],
        },
      },
      {
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          // Resets dardachat_test once per run (drop public → push → sql/*.sql), then files run one at a time.
          globalSetup: ["src/test/global-setup-db.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          env: { DATABASE_URL: testDatabaseUrl, TEST_DATABASE_URL: testDatabaseUrl },
        },
      },
    ],
  },
});
