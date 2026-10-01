# Team JOURNEY — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/journey` (branch `team/journey`). DB 54329, web 3009.
**Owns:** `web/src/modules/journey/**`, `web/src/app/[locale]/(store)/journey/**`, `web/src/app/api/journey/**`,
`web/public/journey/**`, `web/messages/*/journey.json`, `web/tests/e2e/journey/**`.
**SRS:** §4.15 FR-JRN-001..018, §5.2 JourneyResult, §5.3 FR-DAT-002/003, NFR-PRV-005, NFR-USA-002, NFR-PERF-006..008,
NFR-SCL-004, CON-07, AS-14/15/20. The client concept document (OI-02) does NOT exist yet.

**Build:** a real, attractive, lightweight 3D experience with **placeholder content clearly marked PLACEHOLDER (OI-02)**:
~5 linear scenes on the theme of a conversation-games evening (e.g. arriving, the table, the first card, a challenge,
the reveal), 3 choices per scene, ~4 traits, ~6 result types with bilingual interpretation copy — all content in one data
file so the real concept can replace it. three + R3F, procedural/low-poly geometry (no big downloads; initial interactive
payload ≤ 1 MB, later scenes preloaded progressively), WebGL 2 probe before any asset load with a plain locale message on
failure, reduced motion (cuts instead of camera moves), audio off until interaction + always-reachable mute, full keyboard
play, AA non-canvas chrome, entertainment disclaimer before the result. Server-side scoring only (one implementation;
nothing of it shipped to the client); result viewable without personal data; save/share gated by contact capture with a
consent statement covering contact + choice data (session linked to a customer only after consent, via the engagement
consent contract); Web Share API with copy-link fallback, shareable result URL; anonymous sessions reduced to aggregates
after 90 days and identified data anonymised after 60 months inactivity (jobs); Journey data as its own consent/retention
category. Static assets under `web/public/journey` (CDN-ready).
