// Full-page screenshots that scroll through the page first so scroll-reveal fires. Run from web/:
//   node ../design/prototypes/_build/shot_full.cjs services.html --w=390 [--en] [--dark] [--reduce] [--out=DIR]
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), page = args.find(a => !a.startsWith('--')) || 'index.html';
const opt = k => { const a = args.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] ?? true) : undefined; };
const W = +(opt('w') || 390), H = +(opt('h') || 844);
const OUT = opt('out') || path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: opt('reduce') ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(), errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  const qs = new URLSearchParams(); if (opt('en')) qs.set('lang', 'en'); if (opt('dark')) qs.set('theme', 'dark');
  await p.goto(`http://127.0.0.1:${srv.address().port}/${page}${qs.toString() ? '?' + qs : ''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.floor(H * 0.6)) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(280); }
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  const base = path.basename(page, '.html');
  const name = `${base}-${W}${opt('en') ? '-en' : '-ar'}${opt('dark') ? '-dark' : ''}${opt('reduce') ? '-reduce' : ''}.png`;
  // sticky bars would repeat in a full-page shot; un-stick them for the capture
  if (!opt('keepsticky')) await p.addStyleTag({ content: '.dc-svc-top,.dc-svc-sub{position:static!important}.dc-proto-bar{display:none!important}' });
  await p.screenshot({ path: path.join(OUT, name), fullPage: true });
  const info = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, hiddenRv: document.querySelectorAll('.dc-rv:not(.is-in)').length }));
  console.log(JSON.stringify({ file: path.join(OUT, name), ...info, errors: errs }));
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
