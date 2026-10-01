const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${port}/home.html`); 
  const clip = { x: 0, y: 0, width: 1280, height: 660 };
  let t0 = Date.now();
  for (const t of [200, 700, 1250, 1500, 2400]) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await p.screenshot({ path: path.join(ROOT, 'shots', `home-anim-${t}.png`), clip }); }
  // draw twice by keyboard
  await p.focus('#drawBtn'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(ROOT, 'shots', 'home-anim-drawn.png'), clip });
  console.log(await p.evaluate(() => ({ cards: document.querySelectorAll('.dc-home-card').length, live: document.querySelector('#live').textContent })));
  console.log(errs);
  await b.close(); srv.close();
})();
