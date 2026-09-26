// Seed runner. Module seeds are added in PLA-17/18; each must be idempotent (upsert by natural key).
import { createDb } from "./connection";

export async function runSeed(url: string): Promise<void> {
  const { client } = createDb(url, { max: 1 });
  try {
    // module seeds run here in dependency order
  } finally {
    await client.end();
  }
}
