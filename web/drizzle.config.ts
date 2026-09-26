import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: path.resolve(".env.local"), quiet: true });
config({ path: path.resolve(".env"), quiet: true });

// scripts/db-setup.ts sets DRIZZLE_DATABASE_URL to target the dev or the test database.
const url =
  process.env.DRIZZLE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  `postgres://postgres:postgres@localhost:${process.env.PG_PORT ?? 54320}/dardachat`;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  casing: "snake_case",
  dbCredentials: { url },
  strict: false,
  verbose: false,
});
