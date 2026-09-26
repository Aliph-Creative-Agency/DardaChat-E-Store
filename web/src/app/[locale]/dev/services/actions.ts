"use server";

import { revalidatePath } from "next/cache";
import { FAULT_MODES, setFault, type FaultMode } from "@/lib/faults";
import { isServiceName, reportRecovery } from "@/lib/health";

/** Dev only: set or clear the injected fault for one service (settings key `dev.faults`). */
export async function setFaultAction(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const service = String(formData.get("service") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!isServiceName(service)) return;
  const next = (FAULT_MODES as readonly string[]).includes(mode) ? (mode as FaultMode) : null;
  await setFault(service, next);
  revalidatePath(`/${locale}/dev/services`);
}

/** Dev only: mark a service up again without waiting for the next successful call. */
export async function markUpAction(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const service = String(formData.get("service") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!isServiceName(service)) return;
  await reportRecovery(service);
  revalidatePath(`/${locale}/dev/services`);
}
