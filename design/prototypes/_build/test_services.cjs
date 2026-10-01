const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}/services.html`;
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  // flip hero cards
  const hc = p.locator('.dc-svc-deck .dc-qcard'); await hc.nth(0).click(); await hc.nth(2).click(); await p.waitForTimeout(1000);
  await p.screenshot({ path: path.join(ROOT, 'shots/services-1280-ar-hero-flipped.png'), clip: { x: 0, y: 0, width: 1280, height: 560 } });
  // filter couples
  await p.locator('#wsFilters [data-f=couples]').click(); await p.waitForTimeout(900);
  const vis = await p.locator('#wsGrid .dc-svc-card:visible').count(); const cnt = await p.locator('#wsCount').innerText();
  // draw card
  await p.locator('#sessions').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('#drawCard').click(); await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(ROOT, 'shots/services-1280-ar-sessions-flipped.png') });
  await p.locator('#drawNext').click(); await p.waitForTimeout(900);
  const t2 = await p.locator('#drawText').innerText(); const flipped = await p.locator('#drawCard').getAttribute('aria-pressed');
  const wa = await p.locator('[data-wa]').first().getAttribute('href');
  // keyboard: tab reaches filter chips
  await p.evaluate(() => window.scrollTo(0, 0)); await p.keyboard.press('Tab'); const f1 = await p.evaluate(() => document.activeElement.className);
  // en toggle
  await p.goto(url + '?lang=en', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const dir = await p.evaluate(() => document.documentElement.dir + ' ' + document.title); const wa2 = decodeURIComponent(await p.locator('[data-wa]').first().getAttribute('href'));
  const en = await p.locator('#wsCount').innerText();
  console.log(JSON.stringify({ vis, cnt, t2, flipped, wa: decodeURIComponent(wa), f1, dir, wa2, en, errs }, null, 1));
  await b.close(); srv.close();
})();
