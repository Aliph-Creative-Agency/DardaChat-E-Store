export const meta = {
  name: 'dardachat-relay',
  description: 'DardaChat prototype: leader/worker relay teams with 40%-context handovers (foundation or parallel feature teams)',
  whenToUse: 'Run a phase of the DardaChat prototype build; state lives on disk in .orchestration so relaunches resume',
  phases: [
    { title: 'Plan' },
    { title: 'Build' },
    { title: 'Lanes' },
    { title: 'Merge' },
  ],
}

const ROOT = 'D:/Personal/Projects/DardaChat-E-store'
const ORCH = ROOT + '/.orchestration'
const EFFORT = 'high'
const MAX_CYCLES = (args && args.maxCycles) || 16

const WORKER_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['continue', 'batch_done', 'blocked'] },
    tasks_done: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    next: { type: 'string' },
    next_model: { type: "string", enum: ["opus", "sonnet"], description: "Model for the NEXT worker, chosen from the next open task per PROTOCOL.md section 6" },
  },
  required: ['status', 'summary', 'next'],
}
const LEADER_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['continue', 'team_done', 'blocked'] },
    summary: { type: 'string' },
    open_tasks: { type: 'number' },
    issues: { type: 'array', items: { type: 'string' } },
    next_model: { type: "string", enum: ["opus", "sonnet"], description: "Model for the NEXT worker, chosen from the next open task per PROTOCOL.md section 6" },
  },
  required: ['status', 'summary'],
}

function header(u, role, n) {
  return `You are the ${role.toUpperCase()} of team ${u.team}${u.lane ? ' (lane ' + u.lane + ')' : ''} in the DardaChat Prototype 1 build. ` +
    `Relay #${n}.\n\nFIRST read ${ORCH}/PROTOCOL.md and follow it exactly (start-up order, the 40% context rule, handover format, commit rules). ` +
    `Your team folder (BRIEF/TASKS/HANDOVER/LEADER files) is ${u.folder}. Your working directory is ${u.dir}. ` +
    `The overall plan is ${ORCH}/PLAN.md.` + (u.extra ? `\n\nPhase-specific context: ${u.extra}` : '') + '\n\n'
}

function planPrompt(u) {
  return header(u, 'leader', 0) +
    `YOUR JOB NOW: PLAN.\n` +
    `- If ${u.folder}/TASKS.md is missing or empty: write it. An ordered list of small tasks (each roughly 1-2 hours of agent work) that covers the ENTIRE brief (${u.folder}/BRIEF.md; the lane scope if you are a lane). ` +
    `Each task: an ID (e.g. ${u.team.slice(0, 3).toUpperCase()}-01), the SRS ids it covers, the files/paths it touches (inside your team's owned paths only), and a concrete acceptance check (a command, a test, or a browser check). ` +
    `Environment/setup tasks first; order so the app runs early and every task leaves the build green; tests alongside features. Anything you deliberately leave out of the prototype goes to ${ORCH}/BACKLOG.md with a reason.\n` +
    (u.setup ? `- Environment: ${u.setup}\n` : '') +
    `- Write the initial ${u.folder}/HANDOVER.md (Next move = first task) and ${u.folder}/LEADER.md (your plan rationale, risks, how you will validate).\n` +
    `- If TASKS.md already exists (this is a relaunch), do NOT re-plan: reconcile TASKS.md and HANDOVER.md against git log / the working tree, fix inconsistencies, and make sure "Next move" is right.\n` +
    `Return status "continue" when the plan is ready (or "team_done" if a relaunch finds everything already done and validated).`
}

function workerPrompt(u, n, lastReview) {
  return header(u, 'worker', n) +
    `YOUR JOB: pick up from ${u.folder}/HANDOVER.md and work through ${u.folder}/TASKS.md in order (skip [x] done and [!] blocked). ` +
    `If HANDOVER.md is missing, or the worktree environment is incomplete (web/node_modules, web/.env.local with your ports, the dev DB set up and seeded), fix that first — it is the leader's unfinished setup. ` +
    `For each task: implement, verify against its acceptance check, tick it with one line of evidence, commit. ` +
    (lastReview ? `The leader's latest review said: ${lastReview}\n` : '') +
    `Retire on the 40% rule, or when no open task remains (status batch_done), or if you are genuinely blocked (status blocked). ` +
    `Before returning: stop any dev server / DB you started, make sure everything is committed, overwrite HANDOVER.md per the protocol.`
}

function reviewPrompt(u, n, workerResult) {
  return header(u, 'leader', n) +
    `YOUR JOB NOW: VALIDATE AND STEER. The last worker returned: ${JSON.stringify(workerResult)}\n` +
    `Read ${u.folder}/LEADER.md to see what you have already validated. Independently verify every task ticked since then: typecheck, lint, run the relevant tests, ` +
    `start the app on your team's port and actually exercise the feature (Playwright script or the browse skill), and compare against the SRS acceptance criteria for the ids it covers. ` +
    `Check ownership: \`git diff --stat\` of the new commits must stay inside the team's owned paths (except entries recorded in CHANGE-REQUESTS.md). ` +
    `Anything failing, missing, shallow, or ugly (for UI) → reopen the task or add a precise fix task at the head of the remaining queue. ` +
    `Update LEADER.md (what you checked, verdicts) and HANDOVER.md "Next move". Stop servers you started and commit.\n` +
    `Return "team_done" ONLY if every task in TASKS.md is [x] and validated (deliberate deferrals are in BACKLOG.md), the build and tests are green, and all work is committed. ` +
    `Return "blocked" only if no further progress is possible without outside input. Otherwise "continue". Put the single most important instruction for the next worker in "summary".`
}

async function runUnit(u, phaseName, doPlan) {
  let nulls = 0
  if (doPlan) {
    let p = null
    for (let i = 0; i < 3 && !p; i++) {
      p = await agent(planPrompt(u), { label: `${u.id} leader: plan`, phase: phaseName, schema: LEADER_SCHEMA, effort: EFFORT, model: 'opus' })
    }
    if (!p) return { unit: u.id, status: 'paused', note: 'plan agent failed 3x (usage limit?)' }
    if (p.status === 'team_done') return { unit: u.id, status: 'team_done', note: p.summary }
  }
  let lastReview = ''
  let nextModel = u.workerModel || 'opus'
  let sinceReview = 0
  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    const w = await agent(workerPrompt(u, cycle, lastReview), { label: `${u.id} worker #${cycle} (${nextModel})`, phase: phaseName, schema: WORKER_SCHEMA, effort: EFFORT, model: nextModel })
    if (!w) { nulls++; if (nulls >= 3) return { unit: u.id, status: 'paused', note: 'worker agents failed 3x in a row (usage limit?)' }; continue }
    nulls = 0
    if (w.next_model) nextModel = w.next_model
    sinceReview++
    if (w.status === 'continue' && sinceReview < 3) { lastReview = ''; continue }
    sinceReview = 0
    const r = await agent(reviewPrompt(u, cycle, w), { label: `${u.id} leader review #${cycle}`, phase: phaseName, schema: LEADER_SCHEMA, effort: EFFORT, model: 'opus' })
    if (!r) { nulls++; if (nulls >= 3) return { unit: u.id, status: 'paused', note: 'leader agents failed 3x (usage limit?)' }; continue }
    log(`${u.id}: review #${cycle} → ${r.status}${r.open_tasks !== undefined ? ' (' + r.open_tasks + ' open)' : ''}`)
    if (r.status === 'team_done') return { unit: u.id, status: 'team_done', note: r.summary }
    if (r.status === 'blocked') return { unit: u.id, status: 'blocked', note: r.summary }
    if (r.next_model) nextModel = r.next_model
    lastReview = r.summary
  }
  return { unit: u.id, status: 'cycle_cap', note: `hit ${MAX_CYCLES} worker cycles` }
}

const mode = args && args.mode
const results = []

if (mode === 'foundation') {
  const PF = ORCH + '/teams/platform'
  const core = {
    id: 'platform/core', team: 'platform', lane: 'core', folder: PF + '/lanes/core', dir: ROOT,
    extra: `Phase 0 Foundation. The team brief is ${PF}/BRIEF.md; your lane is W1 "core" in that brief. Work directly in ${ROOT} on branch main (create the web/ app there). DB port 54320, web port 3000. The lane folder is ${PF}/lanes/core (create it).`,
    setup: `nothing beyond the brief; W1 creates the app in ${ROOT}/web.`,
  }
  phase('Plan')
  const coreRes = await runUnit(core, 'Build', true)
  results.push(coreRes)
  if (coreRes.status !== 'team_done') return { mode, results, stopped: 'core lane did not finish' }

  const lanes = [
    { lane: 'auth', port: '54330/3010' },
    { lane: 'shell', port: '54331/3011' },
    { lane: 'contracts', port: '54332/3012' },
  ].map(l => ({
    id: 'platform/' + l.lane, team: 'platform', lane: l.lane, folder: PF + '/lanes/' + l.lane,
    dir: 'D:/Personal/Projects/DardaChat-wt/platform-' + l.lane,
    extra: `Phase 0 Foundation. The team brief is ${PF}/BRIEF.md; your lane is "${l.lane}" in it (W2 auth / W3 shell / W4 contracts). W1 core is done and on main; read ${PF}/lanes/core/HANDOVER.md for how to run things. Your git worktree is the working directory above on branch platform/${l.lane}. Ports DB/web: ${l.port}. Lane folder: ${PF}/lanes/${l.lane}. The other two lanes run in parallel in their own worktrees; stay inside your lane's scope so the merge is clean.`,
    setup: `if the worktree does not exist: \`git -C ${ROOT} worktree add D:/Personal/Projects/DardaChat-wt/platform-${l.lane} -b platform/${l.lane} main\`, then in its web/: \`npm ci\`, create .env.local from .env.example with the lane ports (${l.port}), db:start, db:setup, db:seed, and confirm tests pass. Do this setup yourself during planning.`,
  }))
  const laneRes = await parallel(lanes.map(u => () => runUnit(u, 'Lanes', true)))
  results.push(...laneRes.map((r, i) => r || { unit: lanes[i].id, status: 'paused', note: 'lane crashed' }))
  if (results.some(r => r.status !== 'team_done')) return { mode, results, stopped: 'a lane did not finish' }

  const merge = {
    id: 'platform/merge', team: 'platform', lane: 'merge', folder: PF + '/lanes/merge', dir: ROOT,
    extra: `Phase 0 Foundation, final step. Lanes core/auth/shell/contracts are done (see ${PF}/lanes/*/HANDOVER.md). Merge branches platform/auth, platform/shell, platform/contracts into main in ${ROOT} (resolve conflicts carefully, keeping both sides' intent), then re-validate everything from clean: npm ci, db:reset/setup/seed, typecheck, lint, all tests, dev server renders /ar and /en storefront and the admin (sign in as seeded Owner incl. 2FA), /dev/outbox works. Fix what breaks. Then \`git tag foundation-v1\` and write ${ORCH}/FOUNDATION-NOTES.md (≤ 80 lines: how to run, where things are, conventions, the contract/stub pattern, gotchas) — every Phase 1 agent reads it. Also ensure ${ORCH}/CONTRACTS.md is accurate. Remove the three platform worktrees with \`git worktree remove\` once merged (keep the branches).`,
    setup: `the lane folder ${PF}/lanes/merge; tasks = merge each branch, validate, fix, tag, notes.`,
  }
  phase('Merge')
  results.push(await runUnit(merge, 'Merge', true))
  return { mode, results }
}

const PORTS = { catalog: [54321, 3001], storefront: [54322, 3002], orders: [54323, 3003], inventory: [54324, 3004], payments: [54325, 3005], engagement: [54326, 3006], insights: [54327, 3007], assistant: [54328, 3008], journey: [54329, 3009] }
const SONNET_FIRST = ['catalog', 'storefront', 'engagement', 'insights', 'orders', 'payments', 'assistant', 'journey'] // 2026-09-30: sonnet default everywhere; PROTOCOL §6 routes risky tasks to opus
function phase1Unit(t) {
  const [pg, web] = PORTS[t]
  return {
    id: t, team: t, workerModel: SONNET_FIRST.includes(t) ? 'sonnet' : 'opus', folder: ORCH + '/teams/' + t, dir: 'D:/Personal/Projects/DardaChat-wt/' + t, skipPlan: !!args.skipPlan,
    extra: `Phase 1 feature team. Foundation is done and tagged foundation-v1 on main. Before anything else read ${ORCH}/FOUNDATION-NOTES.md and ${ORCH}/CONTRACTS.md. Eight other teams build in parallel in their own worktrees; only touch your owned paths (BRIEF.md). Your ports: DB ${pg}, web ${web}. Replace your module stubs with real implementations but keep the contract signatures (or record a contract change in CHANGE-REQUESTS.md + DECISIONS.md). Other modules stay stubs in your branch until integration, so test your module with its dependencies stubbed or seeded directly.`,
    setup: `if the worktree does not exist: \`git -C ${ROOT} worktree add D:/Personal/Projects/DardaChat-wt/${t} -b team/${t} foundation-v1\`; in its web/: \`npm ci\`, create .env.local from .env.example with PG_PORT=${pg} and WEB_PORT=${web} (plus anything FOUNDATION-NOTES.md says), db:start, db:setup, db:seed, and confirm typecheck + tests pass before planning tasks. Do this setup yourself during planning.`,
  }
}

if (mode === 'teams' || mode === 'phase1') {
  const units = mode === 'phase1' ? args.teams.map(phase1Unit) : args.units
  phase('Build')
  // Bounded pool: a usage window only fits a few full relays, so run `concurrency` teams at a time
  // (in the given priority order) instead of starving all of them.
  const conc = args.concurrency || units.length
  const res = new Array(units.length).fill(null)
  let next = 0
  let paused = false
  const runner = async () => {
    while (next < units.length) {
      const k = next++
      const u = units[k]
      if (paused) { res[k] = { unit: u.id, status: 'paused', note: 'not started: window exhausted' }; continue }
      const r = await runUnit(u, 'Build', !u.skipPlan)
      res[k] = r || { unit: u.id, status: 'paused', note: 'crashed' }
      if (res[k].status === 'paused') paused = true
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, units.length) }, runner))
  return { mode, results: res }
}

return { error: 'unknown mode', args }
