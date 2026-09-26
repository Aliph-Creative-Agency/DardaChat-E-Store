/** Phase 0 contract stubs call `stubWarn("<module>.<fn>")` so a dev log shows each fake path once per process. */
const warned = new Set<string>();

export function stubWarn(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  if (process.env.NODE_ENV !== "test" || process.env.STUB_WARN === "1") {
    console.warn(`[stub] ${name} is a Phase 0 contract stub (STUB(contracts))`);
  }
}

/** Names warned so far in this process (tests, /dev/services). */
export function stubWarnings(): readonly string[] {
  return [...warned];
}
