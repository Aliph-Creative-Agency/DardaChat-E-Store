import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the inventory module (name `inventory.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
