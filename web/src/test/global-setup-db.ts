import { spawnSync } from "node:child_process";
import path from "node:path";

/** Vitest globalSetup for the integration project: rebuild the test database schema once per run. */
export default function setup() {
  const root = path.resolve(__dirname, "..", "..");
  const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const res = spawnSync(process.execPath, [tsx, "scripts/db-setup.ts", "--test", "--reset"], {
    cwd: root,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(
      `test DB setup failed (is the DB running? npm run db:start)\n${res.stdout ?? ""}\n${res.stderr ?? ""}`,
    );
  }
}
