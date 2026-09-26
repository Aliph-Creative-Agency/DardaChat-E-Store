import { databaseUrl, isTestFlag } from "./env";
import { resolveSeedStaff } from "./seed-credentials";
import { runSeed } from "../src/db/seed";

const label = isTestFlag() ? "dardachat_test" : "dardachat";

runSeed(databaseUrl({ test: isTestFlag() }), { staff: resolveSeedStaff(), log: (m) => console.log(`[${label}] ${m}`) })
  .then(() => console.log(`[${label}] seed ok (staff passwords: web/.env.local)`))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
