import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the engagement module (name `engagement.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
