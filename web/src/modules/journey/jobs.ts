import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the journey module (name `journey.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
