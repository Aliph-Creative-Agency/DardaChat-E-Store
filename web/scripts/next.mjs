#!/usr/bin/env node
// Runs `next <command>` on WEB_PORT (default 3000), reading .env.local / .env if present.
// Usage: node scripts/next.mjs dev|start [extra next args]
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(file) {
  const out = {};
  const full = path.join(root, file);
  if (!existsSync(full)) return out;
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
const port = process.env.WEB_PORT || fileEnv.WEB_PORT || "3000";
const [command = "dev", ...rest] = process.argv.slice(2);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, command, "--port", port, ...rest], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
