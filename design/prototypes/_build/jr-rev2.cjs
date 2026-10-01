// Journey revision 2 shots. Run from web/: node ../design/prototypes/_build/jr-rev2.cjs [filter]
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots', 'rev2'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const filter = process.argv[2] || '';
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/journey.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  async function job(name, { w, h, lang = 'ar', dark = false, q = '' }, fn) {
    if (filter && !name.includes(filter)) return;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(), errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const qs = new URLSearchParams(q); if (lang === 'en') qs.set('lang', 'en'); if (dark) qs.set('theme', 'dark');
    await p.goto(base + (qs.toString() ? '?' + qs : ''), { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
    const shot = async (tag, opt = {}) => { await p.waitForTimeout(opt.wait ?? 300); await p.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), clip: opt.clip }); };
    await fn(p, shot);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    report.push({ name, overflowPx: ov, errors: errs }); await ctx.close();
  }
  const viewports = [[1280, 800], [390, 844]];
  // every stop, both render paths, both viewports: geometry report of scene vs pills/panel
  for (const [w, h] of viewports) for (const flat of [false, true]) for (const dark of [false]) for (let stop = 1; stop <= 5; stop++) {
    await job(`stop${stop}-${w}-${flat ? 'flat' : '3d'}${dark ? '-night' : ''}`, { w, h, lang: 'en', dark, q: `stop=${stop}` + (flat ? '&webgl=off' : '') }, async (p, shot) => {
      await p.waitForTimeout(1500); await shot('s');
      const g = await p.evaluate(() => { const pr = document.getElementById('jr-panel') || document.querySelector('.dc-jr-panel'), tp = document.querySelector('.dc-jr-top'); const pills = [...tp.children].map(e => e.getBoundingClientRect().bottom); return { panelTop: pr.getBoundingClientRect().top, pillsBottom: Math.max(...pills) }; });
      report.push({ name: `geom-stop${stop}-${w}-${flat ? 'flat' : '3d'}`, ...g });
    });
  }
  console.log(JSON.stringify(report)); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
