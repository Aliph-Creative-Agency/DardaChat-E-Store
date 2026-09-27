/**
 * Standalone job runner.
 *   npm run jobs                      run the scheduler until Ctrl+C
 *   npm run jobs -- --list            print job names
 *   npm run jobs -- --once <name>     run one job now (ignores its interval), exit 1 on failure
 */
import { databaseUrl } from "./env";
import { createDb } from "../src/db/connection";
import { allJobs } from "../src/lib/jobs/registry";
import { createScheduler } from "../src/lib/jobs/scheduler";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const j of allJobs) console.log(`${j.name}	every ${j.intervalMs / 1000}s`);
    return 0;
  }
  const { db, client } = createDb(databaseUrl());
  const scheduler = createScheduler(allJobs, { db });
  const onceIndex = args.indexOf("--once");
  if (onceIndex >= 0) {
    const name = args[onceIndex + 1];
    if (!name) throw new Error("usage: npm run jobs -- --once <name>");
    const result = await scheduler.runOnce(name);
    console.log(JSON.stringify(result));
    await client.end();
    return result.ran && result.status === "ok" ? 0 : 1;
  }
  scheduler.start();
  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await scheduler.stop();
  await client.end();
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
