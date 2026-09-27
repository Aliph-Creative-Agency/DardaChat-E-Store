import type { JobDefinition } from "../../lib/jobs/types";

/** Scheduled jobs of the storefront module (name `storefront.<job>`, idempotent). Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [];
