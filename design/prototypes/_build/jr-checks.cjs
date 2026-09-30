// Journey revision 1 behaviour checks + a few extra shots. Run from D:/Personal/Projects/DardaChat-E-store/web:
//   node ../design/prototypes/_build/jr-checks.cjs
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return ((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2); };
const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/journey.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = {};
  for (const dark of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(base + (dark ? '?theme=dark' : ''), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const o = out['ph' + (dark ? 'Night' : 'Cream')] = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.dc-ph')); return { color: cs.color, bg: cs.backgroundColor }; });
    o.ratio = cr(rgb(o.color), rgb(o.bg));
    if (!dark) {
      out.sound = await p.evaluate(() => [...document.querySelectorAll('.js-sound')].map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]));
      await p.click('.js-sound'); out.soundOn = await p.evaluate(() => [...document.querySelectorAll('.js-sound')].map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed'), b.innerText.trim()]));
      out.gateHelp = await p.evaluate(() => document.querySelector('#jr-contact-h').textContent);
      await p.click('#jr-start'); await p.waitForTimeout(700);
      out.startFocus = await p.evaluate(() => document.activeElement.id);
      out.labels = await p.evaluate(() => [...document.querySelectorAll('.dc-choice b')].map(e => e.textContent));
      for (const k of ['1', '2', '3']) { await p.keyboard.press(k); await p.waitForTimeout(2300); }
      out.stopBefore = await p.evaluate(() => document.querySelector('#jr-where').textContent.trim());
      await p.click('#jr-exit'); await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(OUT, 'journey-1280-ar-8leave-undo.png') });
      out.toast = await p.evaluate(() => document.querySelector('#jr-toast').innerText);
      await p.click('#jr-toast button'); await p.waitForTimeout(900);
      out.after = await p.evaluate(() => ({ where: document.querySelector('#jr-where').textContent.trim(), phase: document.body.dataset.phase, focus: document.activeElement.id }));
      await p.click('#jr-exit'); await p.waitForTimeout(5600); out.toastGone = await p.evaluate(() => !document.querySelector('#jr-toast').classList.contains('is-on'));
      await p.click('#jr-start'); await p.waitForTimeout(400); await p.click('#jr-exit'); await p.waitForTimeout(400); out.noToastAtStop1 = await p.evaluate(() => !document.querySelector('#jr-toast').classList.contains('is-on'));
      await p.click('#jr-start'); await p.waitForTimeout(500); for (const k of ['1', '2', '3', '1', '2']) { await p.keyboard.press(k); await p.waitForTimeout(2300); }
      await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
      await p.click('#jr-save'); await p.waitForTimeout(500); await p.fill('#jr-contact', 'abc'); await p.click('#jr-gate-form button[type=submit]'); await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(OUT, 'journey-1280-ar-7gate-errors.png') });
      out.gateErr = await p.evaluate(() => [document.querySelector('#jr-contact-h').textContent, !document.querySelector('#jr-consent-e').hidden]);
      await p.fill('#jr-contact', '0591234567'); await p.check('#jr-consent'); await p.click('#jr-gate-form button[type=submit]'); await p.waitForTimeout(500);
      out.saved = await p.evaluate(() => ({ saveT: document.querySelector('#jr-save-t').textContent, savedShown: !document.querySelector('#jr-saved').hidden }));
      await p.screenshot({ path: path.join(OUT, 'journey-1280-ar-9saved.png') });
      out.shareUrl = await p.evaluate(() => { let u = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: x => { u = x; return Promise.resolve(); } }, configurable: true }); document.querySelector('#jr-share').click(); return new Promise(r => setTimeout(() => r(u), 200)); });
    }
    out['errors' + dark] = errs; await ctx.close();
  }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(base + '?lang=en', { waitUntil: 'networkidle' }); await p.waitForTimeout(600); await p.click('#jr-start'); await p.waitForTimeout(500);
    for (const k of ['1', '2', '3', '1', '2']) { await p.keyboard.press(k); await p.waitForTimeout(500); }
    out.reduceFocus = await p.evaluate(() => document.activeElement.id); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    out.reduceResult = await p.evaluate(() => document.querySelector('#jr-result-name').textContent);
    await p.screenshot({ path: path.join(OUT, 'journey-390-en-reduce-result.png') });
    out.errsReduce = errs; await ctx.close(); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
