// Journey revision 2: gate (ar, both themes), intro, stop 3/5 in 3D + flat, zoom crops, DOM checks. Run from web/.
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots', 'rev2'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/journey.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rep = [];
  async function open(w, h, qs, dpr = 1) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const p = await ctx.newPage(); p.errs = []; p.on('console', m => m.type() === 'error' && p.errs.push(m.text())); p.on('pageerror', e => p.errs.push(String(e))); await p.goto(base + '?' + qs, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); p.ctx = ctx; return p; }
  // gate, ar, both themes: initial, after error, after error + valid submit reopen
  for (const dark of [false, true]) {
    const p = await open(1280, 800, 'result=warm' + (dark ? '&theme=dark' : ''));
    await p.click('#jr-save'); await p.waitForTimeout(500);
    const helpText = () => p.evaluate(() => document.getElementById('jr-contact-h').textContent);
    const shotDlg = async (tag) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, `gate-ar-${dark ? 'night' : 'cream'}-${tag}.png`), clip: { x: 400, y: 100, width: 480, height: 620 } }); };
    rep.push({ dark, initial: JSON.stringify(await helpText()) }); await shotDlg('1initial');
    await p.click('button[type=submit]'); await p.waitForTimeout(300); rep.push({ dark, afterError: await helpText() }); await shotDlg('2error');
    await p.fill('#jr-contact', 'a@b.co'); await p.check('#jr-consent'); await p.click('button[type=submit]'); await p.waitForTimeout(600);
    await p.click('#jr-save'); await p.waitForTimeout(400); rep.push({ dark, afterValid: JSON.stringify(await helpText()) }); await shotDlg('3after-valid');
    // crop the help line at 2x for order check
    rep.push({ errors: p.errs }); await p.ctx.close();
  }
  // focus ring on face-down card
  { const p = await open(390, 844, 'result=warm'); await p.evaluate(() => { const c = document.querySelector('#jr-reveal'); if (c.classList.contains('is-flipped')) c.classList.remove('is-flipped'); });
    // reload without result to reach facedown state: play via shared flow
    await p.close(); }
  for (const w of [1280, 390]) {
    const p = await open(w, w === 1280 ? 800 : 844, 'lang=en'); await p.click('#jr-start'); await p.waitForTimeout(500);
    for (let i = 0; i < 5; i++) { await p.keyboard.press(String(i % 3 + 1)); await p.waitForTimeout(i < 4 ? 2300 : 1600); }
    await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, `result-facedown-focus-${w}.png`) });
    rep.push({ w, focusRadius: await p.evaluate(() => getComputedStyle(document.activeElement).borderRadius + ' ' + document.activeElement.id + ' ' + getComputedStyle(document.activeElement).outlineOffset) });
    await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    rep.push({ w, name: await p.evaluate(() => [document.getElementById('jr-typename').innerHTML, document.getElementById('jr-result-name').innerHTML]) });
    await p.ctx.close();
  }
  // where pill textContent
  for (const lang of ['ar', 'en']) { const p = await open(1280, 800, `stop=4&lang=${lang}`); rep.push({ lang, where: JSON.stringify(await p.evaluate(() => document.getElementById('jr-where').textContent)) }); await p.ctx.close(); }
  // intro + stop3 + stop5, both paths, both themes at 1280
  for (const dark of [false, true]) for (const flat of [false, true]) {
    const q = (dark ? 'theme=dark&' : '') + 'lang=en' + (flat ? '&webgl=off' : '');
    let p = await open(1280, 800, q); await p.screenshot({ path: path.join(OUT, `intro-1280-${flat ? 'flat' : '3d'}-${dark ? 'night' : 'cream'}.png`) }); await p.ctx.close();
    for (const stop of [3, 5]) { p = await open(1280, 800, q + '&stop=' + stop); await p.waitForTimeout(1200); await p.screenshot({ path: path.join(OUT, `stop${stop}-1280-${flat ? 'flat' : '3d'}-${dark ? 'night' : 'cream'}.png`) }); rep.push({ stop, flat, dark, errs: p.errs }); await p.ctx.close(); }
  }
  // zoom crops at 2x
  for (const stop of [3, 5]) for (const dark of [false, true]) { const p = await open(1280, 800, `stop=${stop}&lang=en` + (dark ? '&theme=dark' : ''), 2); await p.waitForTimeout(800); await p.screenshot({ path: path.join(OUT, `zoom-rug-shadows-stop${stop}-${dark ? 'night' : 'cream'}.png`), clip: { x: 340, y: 110, width: 600, height: 370 } }); await p.ctx.close(); }
  { const p = await open(1280, 800, 'lang=en', 2); await p.waitForTimeout(800); await p.screenshot({ path: path.join(OUT, `zoom-rug-shadows-intro.png`), clip: { x: 640, y: 60, width: 640, height: 500 } }); await p.ctx.close(); }
  console.log(JSON.stringify(rep, null, 1)); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
