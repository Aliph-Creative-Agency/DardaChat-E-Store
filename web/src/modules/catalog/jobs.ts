import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the catalog module (name `catalog.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
