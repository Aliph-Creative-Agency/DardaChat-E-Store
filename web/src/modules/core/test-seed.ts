/**
 * Test helper for contract integration tests: empty the test DB and load the standard seed (5 titles, stock at
 * STORE/HOME, zones, VAT 16 %, policies, FAQ…). Use in `beforeAll` of an `*.int.test.ts` file. Test-only.
 */
import type { Db } from "../../db/connection";
import { runSeed } from "../../db/seed";
import { testDatabaseUrl, truncateAll } from "../../db/test-utils";

export const TEST_STAFF = {
  owner: { email: "owner@contracts.test", password: "contracts-owner-test-pass" },
  staff: { email: "staff@contracts.test", password: "contracts-staff-test-pass" },
};

export async function resetAndSeed(db: Db): Promise<void> {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), { staff: TEST_STAFF });
}
