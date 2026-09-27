/** Every module's scheduled jobs (DECISIONS 2026-09-26 "jobs"). Add a module here when it gains a jobs.ts. */
import { jobs as assistant } from "../../modules/assistant/jobs";
import { jobs as catalog } from "../../modules/catalog/jobs";
import { jobs as core } from "../../modules/core/jobs";
import { jobs as engagement } from "../../modules/engagement/jobs";
import { jobs as insights } from "../../modules/insights/jobs";
import { jobs as inventory } from "../../modules/inventory/jobs";
import { jobs as journey } from "../../modules/journey/jobs";
import { jobs as orders } from "../../modules/orders/jobs";
import { jobs as payments } from "../../modules/payments/jobs";
import { jobs as storefront } from "../../modules/storefront/jobs";
import type { JobDefinition } from "./types";

export const allJobs: readonly JobDefinition[] = [
  ...core,
  ...catalog,
  ...inventory,
  ...orders,
  ...payments,
  ...engagement,
  ...insights,
  ...assistant,
  ...journey,
  ...storefront,
];

const names = allJobs.map((j) => j.name);
const dup = names.find((n, i) => names.indexOf(n) !== i);
if (dup) throw new Error(`duplicate job name ${dup}`);
