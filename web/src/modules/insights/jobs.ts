import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the insights module (name `insights.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
