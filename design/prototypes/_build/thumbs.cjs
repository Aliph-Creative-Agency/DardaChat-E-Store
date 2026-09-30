// Gallery thumbnails for index.html: one 1280x800 first-viewport shot per screen, ar + en, Cream.
// Run from D:/Personal/Projects/DardaChat-E-store/web:  node ../design/prototypes/_build/thumbs.cjs
// Writes design/prototypes/shots/thumbs/<screen>-<lang>-full.png (resize with _build/thumbs_resize.py).
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots', 'thumbs'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f).toLowerCase()] || 'application/octet-stream' }); r.end(d); }); });
const SCREENS = [
  { s: 'home', q: '', wait: 3200 },
  { s: 'shop', q: '', wait: 1800 },
  { s: 'product', q: '', wait: 1800 },
  { s: 'cart-checkout', q: '', hash: '#cart', wait: 2000 },
  { s: 'services', q: '', wait: 2600 },
  { s: 'journey', q: 'stop=3', wait: 5000 },
  { s: 'assistant', q: 'open=1', ask: { ar: 'شو في جوّا الصندوق؟', en: "What's inside the box?" }, wait: 7000 },
  { s: 'index', q: '', wait: 2600, only: process.argv.includes('--index') },
];
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const report = [];
  for (const sc of SCREENS) { if (sc.s === 'index' && !sc.only) continue; if (process.argv.includes('--index') && sc.s !== 'index') continue;
    for (const lang of ['ar', 'en']) {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(), errs = [];
      p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
      const qs = new URLSearchParams(sc.q); if (lang === 'en') qs.set('lang', 'en'); if (sc.ask) qs.set('ask', sc.ask[lang]);
      await p.goto(`http://127.0.0.1:${port}/${sc.s}.html?${qs}${sc.hash || ''}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(sc.wait);
      await p.addStyleTag({ content: '.dc-proto-bar{display:none!important}' }).catch(() => {});
      await p.screenshot({ path: path.join(OUT, `${sc.s}-${lang}-full.png`) });
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      report.push({ s: sc.s, lang, overflow, errs }); await ctx.close();
    } }
  console.log(JSON.stringify(report)); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
