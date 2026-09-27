import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the assistant module (name `assistant.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
