// Zoomed pawn crops at stops 3 and 5 (1280x800, 2x). Run from web/: node ../design/prototypes/_build/jr-zoom.cjs
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/journey.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const stop of [3, 5]) for (const dark of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
    await p.goto(base + `?stop=${stop}&lang=en` + (dark ? '&theme=dark' : ''), { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
    await p.screenshot({ path: path.join(OUT, `journey-1280-en${dark ? '-dark' : ''}-zoom-stop${stop}.png`), clip: { x: 340, y: 90, width: 600, height: 400 } });
    await ctx.close();
  }
  await b.close(); srv.close();
})();
