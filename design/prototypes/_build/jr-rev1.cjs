// Journey revision 1 walk-through + screenshots. Run from D:/Personal/Projects/DardaChat-E-store/web:
//   node ../design/prototypes/_build/jr-rev1.cjs [filter]
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const filter = process.argv[2] || '';
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/journey.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  async function job(name, { w = 390, h = 844, lang = 'ar', dark = false, q = '', reduce = false }, fn) {
    if (filter && !name.includes(filter)) return;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
    const p = await ctx.newPage(), errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const qs = new URLSearchParams(q); if (lang === 'en') qs.set('lang', 'en'); if (dark) qs.set('theme', 'dark'); if (reduce) qs.set('motion', 'reduce');
    await p.goto(base + (qs.toString() ? '?' + qs : ''), { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    const shot = async (tag, opt = {}) => { await p.waitForTimeout(opt.wait ?? 500); const f = path.join(OUT, `journey-${w}-${lang}${dark ? '-dark' : ''}-${tag}.png`); await p.screenshot({ path: f, fullPage: !!opt.full, clip: opt.clip }); };
    await fn(p, shot);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    report.push({ name, overflowPx: ov, errors: errs }); await ctx.close();
  }
  const pickAll = async (p, upTo = 5, stopAt) => { for (let i = 0; i < upTo; i++) { await p.waitForTimeout(stopAt === i ? 0 : 1400); if (stopAt === i) break; await p.keyboard.press(String((i % 3) + 1)); } };
  const walk = async (p, shot, tag, n) => { // start, then answer n stops
    await p.click('#jr-start'); await p.waitForTimeout(700); await shot(tag + '-stop1');
    for (let i = 0; i < n; i++) { await p.keyboard.press(String(i % 3 + 1)); await p.waitForTimeout(2300); }
  };
  for (const w of [1280, 390]) for (const lang of ['ar', 'en']) for (const dark of [false, true]) {
    const tag = `${lang}${dark ? 'd' : ''}${w}`, h = w === 1280 ? 800 : 844;
    await job(`play-${tag}`, { w, h, lang, dark }, async (p, shot) => {
      await shot('1intro');
      await p.click('#jr-start'); await p.waitForTimeout(800); await shot('2stop1');
      await p.keyboard.press('1'); await p.waitForTimeout(2400); await p.keyboard.press('2'); await p.waitForTimeout(2600); await shot('3stop3', { wait: 1800 });
      await p.keyboard.press('3'); await p.waitForTimeout(2400); await p.keyboard.press('1'); await p.waitForTimeout(2400); await shot('4stop5', { wait: 2600 });
      await p.keyboard.press('2'); await p.waitForTimeout(1800); await shot('5result-facedown');
      await p.keyboard.press('Enter'); await p.waitForTimeout(1800); await shot('6result'); await shot('6result-full', { full: true });
    });
  }
  // shared link
  for (const w of [1280, 390]) for (const lang of ['ar', 'en']) await job(`shared-${lang}${w}`, { w, h: w === 1280 ? 800 : 844, lang, q: 'result=warm&shared=1' }, async (p, shot) => { await shot('shared'); await shot('shared-full', { full: true }); });
  // flat fallback (night + cream)
  for (const w of [1280, 390]) for (const dark of [false, true]) await job(`flat-${w}${dark}`, { w, h: w === 1280 ? 800 : 844, lang: 'ar', dark, q: 'webgl=off' }, async (p, shot) => {
    await shot('flat-intro'); await p.click('#jr-start'); await p.waitForTimeout(600); await p.keyboard.press('1'); await p.waitForTimeout(2300); await p.keyboard.press('2'); await p.waitForTimeout(2300); await shot('flat-stop3'); await p.keyboard.press('3'); await p.waitForTimeout(2300); await p.keyboard.press('1'); await p.waitForTimeout(2300); await shot('flat-stop5');
  });
  console.log(JSON.stringify(report, null, 1)); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
