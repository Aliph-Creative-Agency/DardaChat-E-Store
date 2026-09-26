import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the payments module (name `payments.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
