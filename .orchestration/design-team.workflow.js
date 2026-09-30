export const meta = {
  name: 'dardachat-design-team',
  description: 'Supervisor + designer agents build animated Dardachat screen prototypes on the design system',
  phases: [{ title: 'Setup' }, { title: 'Design' }, { title: 'Gallery' }],
}
const BRIEF = 'D:/Personal/Projects/DardaChat-E-store/.orchestration/teams/design/BRIEF.md'
const OUT = 'D:/Personal/Projects/DardaChat-E-store/design/prototypes'
const HDR = `You are part of the DESIGN team for Dardachat. Read ${BRIEF} first and follow it exactly. Do not invoke the task-observer skill. Use the frontend-design (or impeccable) skill for craft. Never touch web/ or any git branch; never commit. Work only under ${OUT}. If you run out of room (about 40% of your context), save your work, write a short ${OUT}/HANDOVER-<your-screen-or-role>.md (state + next move) and return.\n\n`
const REVIEW = { type: 'object', properties: { verdict: { type: 'string', enum: ['approve', 'revise'] }, fixes: { type: 'string' } }, required: ['verdict', 'fixes'] }
const SCREENS = ['home', 'shop', 'product', 'cart-checkout', 'services', 'journey', 'assistant']

phase('Setup')
await agent(HDR + `ROLE: SUPERVISOR (setup). Create ${OUT}/assets (logo crops via Python PIL from the Canva screenshot coordinates in the brief), ${OUT}/ds.css (tokens.json → CSS custom properties, Cream + Night themes, then the design system's bundle.css verbatim incl. its Google Fonts @import) and ${OUT}/_shared.js (tiny helpers every screen may use: ar/en toggle that flips dir/lang and swaps [data-ar]/[data-en] text, theme toggle, reduced-motion flag). Write ${OUT}/NOTES.md with the shared conventions (file layout, class prefix dc-, how screens include ds.css/_shared.js, motion rules summary). Verify ds.css parses by rendering one component preview against it with Playwright (web/node_modules has @playwright/test; run node from D:/Personal/Projects/DardaChat-E-store/web). Return a one-paragraph summary.`, { label: 'supervisor: setup', phase: 'Setup', model: 'opus', effort: 'high' })

phase('Design')
const results = await pipeline(SCREENS,
  s => agent(HDR + `ROLE: DESIGNER for screen "${s}". Read ${OUT}/NOTES.md, the brand book README.md and the relevant component previews. Build ${OUT}/${s}.html as described in the brief, including its signature animations. Check it yourself with Playwright screenshots at 390px and 1280px in ar and en (save to ${OUT}/shots/${s}-*.png) and fix what looks off. Return what you built in 3 lines.`, { label: `designer: ${s}`, phase: 'Design', model: 'sonnet', effort: 'high' }),
  async (built, s) => {
    for (let round = 1; round <= 2; round++) {
      const r = await agent(HDR + `ROLE: SUPERVISOR reviewing screen "${s}" (round ${round}). Designer said: ${built}\nOpen ${OUT}/${s}.html in Playwright at 390px and 1280px, ar and en, light and dark; click through its interactions and animations. Judge against the brief, the brand book and craft: hierarchy, RTL correctness, contrast (no small red text), motion quality and restraint, real copy, no generic AI look. Verdict "approve" or "revise" with precise fixes.`, { label: `supervisor: review ${s} #${round}`, phase: 'Design', model: 'opus', effort: 'high', schema: REVIEW })
      // A failed (null) review is NOT an approval: the screen stays unreviewed.
      if (!r) return { s, status: 'not_reviewed' }
      if (r.verdict === 'approve') return { s, status: 'approved', round }
      built = await agent(HDR + `ROLE: DESIGNER for screen "${s}", revision ${round}. Apply these supervisor fixes to ${OUT}/${s}.html, re-check with screenshots, return 2 lines: ${r.fixes}`, { label: `designer: ${s} fix #${round}`, phase: 'Design', model: 'sonnet', effort: 'high' })
      if (!built) return { s, status: 'fix_interrupted', round }
    }
    return { s, status: 'revise_after_2_rounds' }
  })

phase('Gallery')
const summary = await agent(HDR + `ROLE: SUPERVISOR (wrap-up). Screens: ${JSON.stringify(results)}. Build ${OUT}/index.html: an on-brand gallery linking each screen with a one-line description and a thumbnail from shots/. Update NOTES.md with decisions and what is placeholder. Return a short plain-language summary for Obaida: what each screen shows and its signature animation, and anything not approved.`, { label: 'supervisor: gallery', phase: 'Gallery', model: 'opus', effort: 'high' })
return { results, summary }
