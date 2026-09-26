import "server-only";
import { createDb, defaultDatabaseUrl, type Db } from "./connection";

// One pool per server process; survives Next.js dev HMR via globalThis.
const globalForDb = globalThis as unknown as { __dardachatDb?: Db };

export const db: Db = globalForDb.__dardachatDb ?? createDb(defaultDatabaseUrl()).db;
if (process.env.NODE_ENV !== "production") globalForDb.__dardachatDb = db;

export type { Db, Tx, DbOrTx } from "./connection";
