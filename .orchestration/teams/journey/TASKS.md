# Tasks — team JOURNEY (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/journey` (branch `team/journey`), commands from `web/`. DB 54329, web 3009.
Owned paths (BRIEF): `web/src/modules/journey/**`, `web/src/app/[locale]/(store)/journey/**`, `web/src/app/api/journey/**`,
`web/public/journey/**`, `web/messages/*/journey.json`, `web/tests/e2e/journey/**`, plus (PLAN §2 "each module owns
admin/<module>/", decision recorded in DECISIONS.md) `web/src/app/[locale]/admin/journey/**`.
Every task: typecheck (`npx tsc --noEmit` after `npx next typegen`) + its tests green before `[x]`; paste one-line evidence.

## Design rules that apply to every task (from LEADER.md)
- ONE concept data file, server-only: `modules/journey/concept/placeholder.ts` (scenes, choices, traits, weights,
  results + bilingual copy, every item flagged `PLACEHOLDER (OI-02)`). It starts with `import "server-only"`.
  The client only ever receives `toPublicScript(concept, locale)` (scene/choice ids, text, visual hints — NO weights,
  NO result rules). Scoring lives only in `modules/journey/scoring.ts` (FR-JRN-017).
- Chrome text (buttons, disclaimer, consent, unsupported, errors) = next-intl `journey` namespace, ar + en parity.
  Concept copy = bilingual fields in the data file (like catalog `nameAr/nameEn`).
- Session = random token in httpOnly cookie `dc_journey` (SameSite=Lax); no customer id until consent (FR-JRN-016).
- Canvas is decorative (`aria-hidden`); every choice is an HTML button in the overlay (keyboard, NFR-USA-002).
- three/R3F code is only reachable through a dynamic import that runs AFTER the WebGL 2 probe passes (FR-JRN-010).

## Tasks

- [x] **JOU-01 Environment + baseline** — SRS: none (setup). Paths: worktree `web/.env.local`, `node_modules`, DB.
  Accept: `npm ci` ok; `npm run db:reset` ok; `npx next typegen && npx tsc --noEmit` exit 0; `npm run test:unit` green.
  Evidence: see HANDOVER relay #0 (leader did this during planning).

## Brand update (2026-09-29, approved by Obaida) — do these first
- [ ] **JOU-B1 Brand direction** (model: opus) — Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Scenes, chrome and share card follow DESIGN.md §2/§4/§8 (palette, brush strokes, finger-heart motif, gathering-at-a-table mood; placeholder narrative can draw on the real boxes in §6). Applies to JOU-06..JOU-11; this task is done when the palette + motif constants exist in one theme file used by the scenes.

- [ ] **JOU-02 Concept data + scoring engine (pure)** — SRS: FR-JRN-003, 004, 005, 014, 015, 017; AS-14/15.
  Paths: `modules/journey/concept/types.ts`, `concept/placeholder.ts`, `concept/public.ts` (`toPublicScript`),
  `scoring.ts`, `scoring.test.ts`, `concept.test.ts`.
  Build: 5 linear scenes (arrival, the table, the first card, a challenge, the reveal), 3 choices each, 4 traits,
  6 result types (ar/en title, short line, ~120-word interpretation each). Choice → weighted deltas on ≥1 trait.
  `scoreChoices(choiceIds[])` validates exactly one choice per scene in scene order (else `AppError invalid_input`),
  sums weights → `TraitProfile`, resolves to exactly one result by a documented rule (e.g. nearest result centroid,
  ties broken by fixed result order). Each choice also carries a `visual` hint (scene-state only, not scoring).
  Accept: `npx vitest run src/modules/journey` green, tests prove: all 3^5 = 243 complete sets resolve to exactly one
  result; same set twice → identical result; every result reachable; wrong order/missing/extra choice rejected;
  `toPublicScript` output contains no weight/trait-rule keys (JSON scan); ar texts contain Arabic script.

- [ ] **JOU-03 Session + completion service (server)** — SRS: FR-JRN-002, 004, 005, 015, 016, 017; §5.2 JourneyResult.
  Paths: `modules/journey/schema.ts` (add `journey_sessions.progress jsonb not null default '[]'`, `completed_result_id`
  if useful), `service.ts`, `types.ts`, `service.int.test.ts`.
  Build: `startSession(locale)` → token; `getSession(token)`; `recordChoice(token, sceneId, choiceId)` (only the next
  scene in order, or re-choose the current last one; touches `last_activity_at`); `completeSession(token)` → scores
  server-side, inserts `journey_results` (customer_id NULL, consent NULL), upserts `journey_aggregates`
  (day in Asia/Jerusalem, `completions+1`), `insights.recordBusinessEvent("journey.completed", payload {resultKey})`
  in one tx; idempotent (second call returns same result). `getResultView(id, {locale, viewerToken?})` → public view
  (result copy only) vs owner view (+ trait profile). Then `npm run db:push` in the worktree.
  Accept: `npm run test:int -- src/modules/journey` green (start → 5 choices → complete; out-of-order rejected;
  replay idempotent; no customer id on session/result; aggregate row incremented once).

- [ ] **JOU-04 Journey API routes** — SRS: FR-JRN-001, 002, 016, 017.
  Paths: `app/api/journey/session/route.ts` (POST start / GET resume), `app/api/journey/session/choice/route.ts`,
  `app/api/journey/session/complete/route.ts`, `modules/journey/http.ts` (cookie helpers, zod schemas, error map).
  Build: httpOnly `dc_journey` cookie; zod-validated bodies; `rateLimit` from `@/modules/auth` per IP; AppError →
  JSON status via `httpStatus`; responses never include weights or trait rules.
  Accept: dev server on 3009; curl sequence start → 5 choices → complete returns `{ resultId, resultKey }` and a second
  complete returns the same; bad choice → 400; unit tests for the zod schemas green.

- [ ] **JOU-05 Contact capture + consent (server)** — SRS: FR-JRN-008, 009, 016; NFR-PRV-005; §5.2 consent_record_id.
  Paths: `modules/journey/consent.ts`, `consent.int.test.ts`, `app/api/journey/results/[id]/claim/route.ts`,
  `concept/consent-statement.ts` (versioned statement id, text lives in messages).
  Build: `claimResult({ resultId, token, contact{name?, phone?, email?}, consent{accepted:true, statementVersion},
  locale }, viewer?)` in ONE tx: verify token owns result; signed-in customer (`getCurrentCustomer`) → that id, else
  `engagement.upsertCustomer`; `engagement.recordConsent({ purpose: "journey_results", source: "journey",
  policyVersion: statementVersion, evidence: { statementVersion, locale, resultId } })`; set result
  `customer_id + consent_record_id`, session `linked_customer_id`; `journey_aggregates.identified+1`; event
  `journey.result_saved`. After commit send the result link via `core.sendMessage` (eventKey `journey.result_link`,
  dedupeKey per result). Missing/false consent → `invalid_input`, nothing written.
  Accept: int tests green: no identity before consent; consent row exists and predates link; check constraint holds;
  second claim idempotent; outbox has the link message (`/api/dev/outbox?to=`).

- [ ] **JOU-06 Messages + route shell + WebGL 2 probe** — SRS: FR-JRN-001, 010; NFR-USA-002; UI-001..003.
  Paths: `messages/ar/journey.json`, `messages/en/journey.json`, `app/[locale]/(store)/journey/page.tsx`,
  `modules/journey/ui/JourneyGate.tsx` (client: probe `canvas.getContext("webgl2")` + basic caps, then
  `import()` the player), `ui/Unsupported.tsx`, `ui/Intro.tsx`.
  Build: intro (title, what it is, PLACEHOLDER (OI-02) badge, "entertainment, not assessment" note, Start); probe runs
  before any 3D import; unsupported → plain localized message + link back to the store; metadata per locale.
  Accept: `/ar/journey` and `/en/journey` render (curl 200 + Playwright screenshot); spec
  `tests/e2e/journey/unsupported.spec.ts` (addInitScript makes getContext("webgl2") return null) shows the message in
  both locales and records no request whose URL contains the player chunk marker or `/journey/` static assets.

- [ ] **JOU-07 3D engine + first two scenes** — SRS: FR-JRN-002, 013, 018; NFR-PERF-006, 007.
  Paths: `modules/journey/ui/player/Stage.tsx`, `CameraRig.tsx`, `useReducedMotion.ts`, `scenes/index.ts`
  (per-scene `dynamic import()` + `preloadScene(n+1)`), `scenes/Arrival.tsx`, `scenes/Table.tsx`, `ui/player/palette.ts`.
  Build: R3F `<Canvas>` with clamped dpr (≤1.5), `powerPreference: "low-power"` off, procedural low-poly geometry +
  flat/standard materials, no textures/models downloaded; camera eases between shots, cuts under reduced motion and
  idle animation stops; next scene's chunk preloaded while current plays. Import only what is used from drei.
  Accept: `/en/journey` → Start → scene 1 renders in Playwright (canvas visible, no console errors, WebGL via
  `--use-angle=swiftshader`); emulated `reducedMotion: "reduce"` → camera position jumps (no intermediate frames
  sampled over 300 ms); `tsc` green.

- [ ] **JOU-08 Scenes 3–5 + choice-driven scene state** — SRS: FR-JRN-002, 015; AS-15; NFR-PERF-006.
  Paths: `modules/journey/ui/player/scenes/FirstCard.tsx`, `Challenge.tsx`, `Reveal.tsx`, `ui/player/sceneState.ts`.
  Build: each choice's `visual` hint changes the current/following scene (lamp colour, card face, object layout) without
  changing which scene comes next; Reveal scene reacts to the whole choice record (not the result — result is unknown
  client-side until the server answers).
  Accept: Playwright plays 3 different choice sets and asserts the scene id sequence is identical (data-scene attr);
  dev FPS readout (`?fps=1`, dev only) shows ≥ 30 fps in headless swiftshader on the leader's machine (informational).

- [ ] **JOU-09 Player chrome: choices, progress, audio, keyboard** — SRS: FR-JRN-002, 012; NFR-USA-002; UI-006.
  Paths: `modules/journey/ui/player/Player.tsx`, `ChoicePanel.tsx`, `Progress.tsx`, `MuteButton.tsx`, `audio.ts`
  (procedural WebAudio ambience + choice chime, nothing downloaded), `api.ts` (client fetch wrappers).
  Build: overlay panel with scene narration (`aria-live="polite"`), choices as buttons (arrow keys + Enter/Space, visible
  focus, focus moves to the new scene heading), step indicator "n / 5", mute toggle always visible in a fixed toolbar
  (default muted until first user gesture; state kept in localStorage try/catch), resume from server progress on reload,
  error toast with retry when the API fails. Logical CSS only, tokens only, RTL correct.
  Accept: spec `tests/e2e/journey/keyboard.spec.ts`: full playthrough with keyboard only in `ar` and `en`; no
  AudioContext is created before the first key press/click (probe via addInitScript); mute button present in every
  scene; `no-literals`/`logical-classes`/messages parity tests green.

- [ ] **JOU-10 Disclaimer + result page** — SRS: FR-JRN-005, 006, 008, 011; AS-20.
  Paths: `app/[locale]/(store)/journey/result/[id]/page.tsx`, `modules/journey/ui/Disclaimer.tsx`,
  `ui/ResultView.tsx`, `ui/TraitBars.tsx`, `public/journey/results/<key>.svg` (6 small static share images).
  Build: after scene 5 → complete → disclaimer interstitial (must acknowledge) → result page. Result shows title +
  interpretation in the viewer's locale, disclaimer line repeated, PLACEHOLDER badge; trait bars only for the owning
  session cookie; shared viewers see a "play it yourself" CTA; unknown/expired id → friendly not-found.
  `generateMetadata` gives og:title/description/image (static SVG→ also PNG if cheap) per result, no personal data.
  Accept: spec `tests/e2e/journey/result.spec.ts`: disclaimer shown before result in ar + en; result renders with no
  contact given; opening the URL in a fresh context shows result copy but no trait bars.

- [ ] **JOU-11 Save/share UI (contact gate)** — SRS: FR-JRN-007, 008, 009; CON-07; NFR-PRV-005.
  Paths: `modules/journey/ui/SaveShareDialog.tsx`, `ui/ShareButton.tsx`, messages.
  Build: "Save my result" / "Share" → if not yet claimed, dialog: phone or email (+ optional name), consent statement
  naming BOTH the contact data and the choice data (unticked checkbox, required), statement version sent with the
  claim; signed-in customer → contact prefilled, consent still required. After claim: Share uses
  `navigator.share({ title, text, url })` when available else copies the link (`navigator.clipboard`) + toast;
  no social-platform API anywhere.
  Accept: spec `tests/e2e/journey/share.spec.ts`: share prompts for contact first; submitting without consent is
  blocked; with consent → consent row `journey_results` (source `journey`) exists and result has customer_id; with
  `navigator.share` deleted the link is copied (clipboard permission granted in context); outbox shows the link.

- [ ] **JOU-12 Retention purger (exported for insights)** — SRS: FR-DAT-002, 003; FR-JRN-016; NFR-PRV-005.
  Paths: `modules/journey/retention.ts`, `retention.int.test.ts` (export wired in JOU-13).
  Build: answers CHANGE-REQUEST insights->journey [2026-09-27 08:30]:
  `purgeJourneyRetention({ category: "journey_results"|"journey_anonymous", olderThan: Date }, ctx?) → { affected }`.
  INSIGHTS' `insights.retention.purge` job schedules it with the periods from `retention_settings`, so journey adds NO
  job of its own (`jobs.ts` stays empty; decision in DECISIONS.md). `journey_anonymous`: unlinked sessions/results with
  last activity < olderThan → delete raw rows (aggregates were already counted at completion). `journey_results`:
  identified results whose customer's last Journey activity < olderThan, plus results whose latest `journey_results`
  consent is a withdrawal → anonymise (unlink customer + consent, delete raw choice/trait data; aggregates kept).
  Batched, idempotent, one tx per batch.
  Accept: int tests with pinned dates: 91-day-old anonymous gone, 89-day-old kept, aggregates unchanged; 61-month
  inactive identified anonymised, 59-month kept; withdrawn consent anonymised; second run → `affected: 0`.

- [ ] **JOU-13 Journey contract for other modules** — SRS: NFR-PRV-005, FR-DAT-002 (portability/erasure hooks).
  Paths: `modules/journey/index.ts`, `types.ts`, `contract.int.test.ts`; per the contract rule in FOUNDATION-NOTES also
  the journey line of `modules/contracts.test.ts` + the journey section of `ROOT/.orchestration/CONTRACTS.md`; mark the
  insights CR answered and add the engagement one (engagement TASKS asks for a results reader).
  Build: exports `purgeJourneyRetention` (JOU-12); `listCustomerJourneyResults(customerId, { locale }, ctx?)` (reader for
  engagement's customer profile + insights' export: id, resultKey, result title, traitScores, choices,
  consentRecordId, completedAt); `anonymiseCustomerJourneyData(customerId, ctx?)` (for insights' erasure; same path as
  JOU-12 identified branch).
  Accept: `npx vitest run src/modules/contracts.test.ts` green; int test for reader + anonymiser green.

- [ ] **JOU-14 Admin Journey page** — SRS: NFR-PRV-005 (visibility), FR-JRN-014 (placeholder status).
  Paths: `app/[locale]/admin/journey/page.tsx`, `modules/journey/admin.ts`, messages.
  Build: first line `await requireStaff("journey.manage", { locale, next })`; completions per result (last 30 days +
  all-time, from aggregates only — no personal data), identified share, retention periods in force, concept status
  banner "PLACEHOLDER content (OI-02)" with scene/result counts.
  Accept: signed-in Owner (e2e `owner-session` fixture) sees the page in ar + en; Staff without the permission is
  denied; auth walker test green.

- [ ] **JOU-15 Payload budget, CDN-ready assets, no scoring on the client** — SRS: FR-JRN-017, 018; NFR-PERF-007, 008;
  NFR-SCL-004.
  Paths: `modules/journey/assets.ts` (`journeyAssetUrl(path)` → `NEXT_PUBLIC_JOURNEY_ASSET_BASE` or `/journey`),
  `tests/e2e/journey/budget.spec.ts`.
  Build: all Journey static files referenced via the helper; spec throttles to 1.6 Mbps / 150 ms RTT (CDP
  `Network.emulateNetworkConditions`) on a production build (`npm run build && npm run start` on 3009) and sums
  transferred bytes until the first choice button is enabled: ≤ 1 MB and ≤ 8 s; spec fetches every JS chunk the
  journey pages load and asserts none contains the scoring sentinel (a unique string constant in `scoring.ts`/weights).
  Accept: budget spec green on the production build; numbers pasted in evidence. If >1 MB: trim (drei imports,
  lazy postprocessing, split scenes) until it passes.

- [ ] **JOU-16 Full e2e + a11y/RTL polish** — SRS: NFR-USA-002, FR-JRN-004, 012, 013; UI-006.
  Paths: `tests/e2e/journey/*.spec.ts`, UI files above.
  Build: `playthrough.spec.ts` (10 random playthroughs → identical scene order), reduced-motion spec, mobile width
  (375 px) screenshots ar + en, contrast check of chrome tokens, focus visible everywhere; run `impeccable` /
  `frontend-design` review on intro, player chrome, result, dialog and fix findings.
  Accept: `npx playwright test tests/e2e/journey` all green on the dev server; `npm run verify` green.

- [ ] **JOU-17 Leader validation + wrap-up** — all of the above.
  Paths: `.orchestration/teams/journey/*`, BACKLOG.md, DECISIONS.md.
  Accept: leader re-runs verify + journey e2e, plays the Journey by hand in a browser in both locales, checks each
  FR-JRN / FR-DAT-002/003 / NFR row in LEADER.md, no `STUB(contracts)` left in `modules/journey`, handover written.
