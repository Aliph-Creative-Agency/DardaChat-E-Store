import { databaseUrl, isTestFlag } from "./env";
import { runSeed } from "../src/db/seed";

runSeed(databaseUrl({ test: isTestFlag() }))
  .then(() => console.log("seed ok"))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
