# Team CLIENT-DEMO (2026-10-01, requested by Obaida) — highest priority; the main build is PAUSED

Goal: as fast as possible, something to show the client (Raneem / Dardachat) that demonstrates how the storefront will
LOOK and the functions it will appear to have. Frontend pages only; no backend. Options to evaluate:
(a) full working demo of the real app, (b) partial demo = clickable, visual-only front end with fake data and simulated
flows, (c) static screenshots. The supervisor decides on speed × persuasiveness × fidelity, then the team delivers it.

**Go-to design source (mandatory):** the Dardachat design system —
`D:/Personal/Projects/DardaChat-E-store/design/system/` (README.md brand book incl. motion rules, tokens.json,
components/bundle.css, 13 components with previews; published at https://claude.ai/artifact/3S8zv14hbuKa78Kye9HbKn)
and the brand spec `D:/Personal/Projects/DardaChat-E-store/.orchestration/DESIGN.md`.
**Existing material to reuse first:** `D:/Personal/Projects/DardaChat-E-store/design/prototypes/` — 7 animated screens
(home, shop, product, cart-checkout, services, journey, assistant), `ds.css`, `_shared.js`, gallery `index.html`,
`NOTES.md`, and `REVIEW-NOTES.md` (open supervisor notes for home, product, cart-checkout, journey, assistant).
The real app in `web/` (branch main + team/* worktrees in D:/Personal/Projects/DardaChat-wt/) is unfinished; reuse only if clearly faster.

**Output:** `D:/Personal/Projects/DardaChat-E-store/design/client-demo/` — the deliverable, a `PLAN.md` (decision +
rationale + page list), and a `README.md` telling Obaida exactly how to open/present it. Screenshots (desktop 1440 +
mobile 390, Arabic first, English too) in `client-demo/screenshots/` whatever the choice, so there is always something to send.

Rules: Arabic RTL default + English toggle; real brand copy from DESIGN.md §6–§7; placeholders clearly but quietly marked
(prices, photos, logo); no lorem ipsum; WCAG AA contrast (no small red text); `prefers-reduced-motion` respected.
Do not touch `web/`, git branches, or commit anything. Do not invoke task-observer. User chat messages are for the orchestrator.
If near ~40% context, save work + write `client-demo/HANDOVER-<role>.md` (state, next move) and return.
COST: Obaida has a limited credit budget. Work lean: reuse, don't rebuild; no exploratory re-renders; one review round.
