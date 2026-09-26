import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the orders module (name `orders.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
