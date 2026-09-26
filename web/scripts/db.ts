/**
 * Embedded Postgres lifecycle for local development (no Docker on this machine).
 *   tsx scripts/db.ts start | stop | status
 * Data lives in web/.pgdata (gitignored); server log in web/.pgdata/log. The server is started with the bundled
 * `pg_ctl` so it keeps running after this command exits (embedded-postgres' own child dies with node).
 */
import { spawnSync } from "node:child_process";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import postgres from "postgres";
import { WEB_ROOT, PG_PORT, DEV_DB, TEST_DB } from "./env";

const DATA_DIR = path.join(WEB_ROOT, ".pgdata", "data");
const LOG_FILE = path.join(WEB_ROOT, ".pgdata", "log");

async function binaries(): Promise<{ pg_ctl: string; initdb: string }> {
  const platform = os.platform() === "win32" ? "windows" : os.platform();
  const mod = (await import(`@embedded-postgres/${platform}-${os.arch()}`)) as { pg_ctl: string; initdb: string };
  return mod;
}

function run(bin: string, args: string[], opts: { allowFail?: boolean } = {}) {
  // stdio must not be a pipe for `pg_ctl start`: the postmaster inherits it and the call would never return.
  const res = spawnSync(bin, args, { stdio: ["ignore", "ignore", "ignore"], windowsHide: true });
  if (res.error) throw res.error;
  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`${path.basename(bin)} ${args.join(" ")} exited with ${res.status} (see ${LOG_FILE})`);
  }
  return res.status ?? 1;
}

async function isRunning(): Promise<boolean> {
  if (!existsSync(DATA_DIR)) return false;
  const { pg_ctl } = await binaries();
  return run(pg_ctl, ["status", "-D", DATA_DIR], { allowFail: true }) === 0;
}

async function initIfNeeded() {
  if (existsSync(path.join(DATA_DIR, "PG_VERSION"))) return;
  const { initdb } = await binaries();
  mkdirSync(DATA_DIR, { recursive: true });
  console.log(`initdb → ${DATA_DIR}`);
  run(initdb, ["-D", DATA_DIR, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-locale"]);
  // CON-10: the server runs in UTC; business boundaries are computed in Asia/Jerusalem by the app.
  appendFileSync(
    path.join(DATA_DIR, "postgresql.conf"),
    ["", "# dardachat", "listen_addresses = 'localhost'", "timezone = 'UTC'", "log_timezone = 'UTC'", "max_connections = 200", ""].join("\n"),
  );
}

async function ensureDatabases() {
  const sql = postgres({ host: "localhost", port: PG_PORT, user: "postgres", password: "postgres", database: "postgres", onnotice: () => {} });
  try {
    for (const name of [DEV_DB, TEST_DB]) {
      const rows = await sql`select 1 from pg_database where datname = ${name}`;
      if (rows.length === 0) {
        await sql.unsafe(`create database "${name}"`);
        console.log(`created database ${name}`);
      }
    }
  } finally {
    await sql.end();
  }
}

async function start() {
  await initIfNeeded();
  if (await isRunning()) {
    console.log(`postgres already running (port ${PG_PORT})`);
  } else {
    const { pg_ctl } = await binaries();
    run(pg_ctl, ["start", "-D", DATA_DIR, "-l", LOG_FILE, "-w", "-t", "60", "-o", `-p ${PG_PORT}`]);
    console.log(`postgres started on port ${PG_PORT}`);
  }
  await ensureDatabases();
}

async function stop() {
  if (!(await isRunning())) {
    console.log("postgres not running");
    return;
  }
  const { pg_ctl } = await binaries();
  run(pg_ctl, ["stop", "-D", DATA_DIR, "-m", "fast", "-w", "-t", "60"]);
  console.log("postgres stopped");
}

async function status() {
  const up = await isRunning();
  console.log(up ? `postgres running (port ${PG_PORT}, data ${DATA_DIR})` : "postgres not running");
  process.exitCode = up ? 0 : 1;
}

const cmd = process.argv[2];
const actions: Record<string, () => Promise<void>> = { start, stop, status };
const action = cmd ? actions[cmd] : undefined;
if (!action) {
  console.error("usage: tsx scripts/db.ts start|stop|status");
  process.exit(2);
}
action().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
