// Screenshot a prototype page over a local static server (file:// blocks some APIs).
// Run from D:/Personal/Projects/DardaChat-E-store/web so @playwright/test resolves:
//   node ../design/prototypes/_build/shot.cjs <page.html> [--w=390] [--h=844] [--en] [--dark] [--reduce] [--wait=1500] [--full] [--out=DIR]
// Prints console errors and the saved PNG path. Screenshots go to --out (default: design/prototypes/_build/shots, git-ignored scratch).
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), page = args.find(a => !a.startsWith('--')) || 'index.html';
const opt = k => { const a = args.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] ?? true) : undefined; };
const W = +(opt('w') || 390), H = +(opt('h') || 844), WAIT = +(opt('wait') || 1500);
const OUT = opt('out') || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f).toLowerCase()] || 'application/octet-stream' }); r.end(d); });
});
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const port = srv.address().port;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: opt('reduce') ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(), errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  const qs = new URLSearchParams(); if (opt('en')) qs.set('lang', 'en'); if (opt('dark')) qs.set('theme', 'dark');
  await p.goto(`http://127.0.0.1:${port}/${page}${qs.toString() ? '?' + qs : ''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(WAIT);
  const name = `${path.basename(page, '.html')}-${W}${opt('en') ? '-en' : ''}${opt('dark') ? '-dark' : ''}${opt('reduce') ? '-reduce' : ''}.png`;
  const file = path.join(OUT, name);
  await p.screenshot({ path: file, fullPage: !!opt('full') });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(JSON.stringify({ file, horizontalOverflowPx: overflow, errors: errs }));
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
