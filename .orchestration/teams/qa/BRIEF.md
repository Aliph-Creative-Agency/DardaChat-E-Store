# Team QA — Phase 3 (acceptance)

**Working dir:** ROOT `D:/Personal/Projects/DardaChat-E-store`, branch `qa` from `prototype-integrated`; fast-forward
`main` at the end and tag `prototype-1`. DB 54320, web 3000.
**Owns:** everything; fixes stay minimal and inside the module that owns the defect.

**Leader:** build `ROOT/.orchestration/ACCEPTANCE.md` — one row per SRS v0.1 requirement (all of §3.1, §3.4, §4, §5.3,
§6): id, priority, prototype scope (IN / MOCKED / DEFERRED with BACKLOG ref), the SRS acceptance criterion, how it was
checked (test name, Playwright spec, manual browser check), result PASS / FAIL / PARTIAL, evidence. Check by actually
driving the running app (Playwright / browse skill) and by running tests — not by reading code alone. Every FAIL or
PARTIAL on an IN-scope Must becomes a task in TASKS.md for workers; S items are fixed if cheap, else BACKLOG.
**Workers:** fix defects, add the missing test that proves each fix, re-run the affected checks, update ACCEPTANCE.md.
**Done when:** no IN-scope Must is FAIL; all tests green; `web/README.md` accurate; `ROOT/.orchestration/REPORT.md` written
for Obaida (≤ 1 page: what exists, how to run it, demo logins location (never paste secrets into the report — point to
`web/.env.local`/README), what is mocked, pass/fail counts, top risks, what the client still needs to supply);
BACKLOG.md complete and deduplicated; main fast-forwarded; tag `prototype-1`.
