# Leader log — journey

## Plan rationale (relay #0, 2026-09-27)
- Order = server truth first (concept data + scoring → sessions/completion → API → consent), then the page shell with the
  WebGL 2 gate, then the 3D player, then result/share, then jobs/contract/admin, then budget + e2e + polish. The app
  runs from JOU-06 on; every task leaves typecheck + tests green.
- FR-JRN-017 drives the file layout: one server-only concept file (`concept/placeholder.ts`, `import "server-only"`)
  holds ALL placeholder content incl. weights (brief: "all content in one data file"); the client receives a projection
  (`toPublicScript`) without weights/rules; scoring only in `scoring.ts`. JOU-15 proves no sentinel reaches client JS.
- Choices recorded server-side per scene (session `progress`) so "records the selection" (FR-JRN-002) and linear order
  (FR-JRN-004/015) are enforced by the server, and reload resumes.
- Aggregates are incremented at completion/claim time (same tx), so the 90-day job only deletes raw rows: idempotent
  and never double-counts (FR-DAT-003). 60-month rule = anonymise by unlinking + deleting raw choice data (FR-DAT-002).
- Consent: purpose `journey_results`, source `journey` (engagement ledger), statement versioned; customer created/linked
  only inside the claim tx after the consent row (FR-JRN-009/016, NFR-PRV-005). Signed-in customers still tick consent.
- Result page public view = result copy only; trait profile (personal data) only for the owning session cookie.
- 3D: procedural low-poly R3F scenes, no downloaded models/textures, WebAudio-synthesised audio → tiny payload; each scene
  a separate dynamic chunk, next one preloaded. Canvas decorative; all interaction is HTML (keyboard/AA).
- Admin page `/admin/journey` (nav item already registered with `journey.manage`) taken under PLAN §2 "each module owns
  admin/<module>/" though BRIEF's list omits it — recorded in DECISIONS.md.

## Risks
- Payload ≤ 1 MB: three (~160 KB gz) + R3F + drei tree-shaking. Mitigation: import drei pieces individually, avoid
  postprocessing/fonts/HDRIs; measure in JOU-15 on a production build; trim if over.
- Headless WebGL in Playwright: use `--use-angle=swiftshader` / `--enable-unsafe-swiftshader` via `test.use`
  launchOptions in our specs (playwright.config is platform-owned).
- Retention periods live in insights' `retention_settings`: read via SHIM(journey) through the `@/db/schema` barrel
  until insights exposes a getter (CHANGE-REQUEST filed).
- No axe-core in deps (package.json is platform's): AA verified by manual token contrast + keyboard specs; BACKLOG.
- npm ci in parallel worktrees failed once (EPERM / DLL init); re-run serially if it happens again.

## How I validate each batch
typecheck + unit + int for touched modules; the task's own acceptance check re-run by me; for UI I load
`http://localhost:3009/{ar,en}/journey` in Playwright (both locales, reduced motion, WebGL off) and read the SRS row
acceptance text against what I see. Verdicts logged below.

## Review log
- relay #0: plan written; environment set up (see HANDOVER).
