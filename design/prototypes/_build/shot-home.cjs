// Scrolls the page first so IntersectionObserver reveals fire, then screenshots. node ../design/prototypes/_build/shot-home.cjs
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const args = process.argv.slice(2);
const runs = args.length ? args : ['390:ar', '390:en', '1280:ar', '1280:en'];
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch();
  for (const run of runs) {
    const [w, lang, ...flags] = run.split(':'); const W = +w;
    const ctx = await b.newContext({ viewport: { width: W, height: W < 600 ? 844 : 800 }, reducedMotion: flags.includes('reduce') ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const qs = new URLSearchParams(); if (lang === 'en') qs.set('lang', 'en'); if (flags.includes('dark')) qs.set('theme', 'dark');
    await p.goto(`http://127.0.0.1:${port}/home.html?${qs}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2600);
    const name = `home-${W}-${lang}${flags.includes('dark') ? '-dark' : ''}${flags.includes('reduce') ? '-reduce' : ''}`;
    await p.screenshot({ path: path.join(OUT, name + '-fold.png') });
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 300) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(name, JSON.stringify({ overflow: ov, errors: errs }));
    await ctx.close();
  }
  await b.close(); srv.close();
})();
