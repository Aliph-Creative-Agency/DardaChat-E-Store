const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const b = await chromium.launch(); const S = process.argv[2];
  for (const [w, lang] of [[1280, 'ar'], [390, 'en'], [390, 'ar']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${srv.address().port}/services.html?lang=${lang}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const hc = p.locator('.dc-svc-deck .dc-qcard'); for (let i = 0; i < 3; i++) await hc.nth(i).click(); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${S}/f-hero-${w}-${lang}.png`, clip: { x: 0, y: 0, width: w, height: w > 600 ? 560 : 844 } });
    await p.locator('#drawCard').scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.locator('#drawCard').click(); await p.waitForTimeout(1000);
    await p.locator('.dc-svc-drawn').screenshot({ path: `${S}/f-draw-${w}-${lang}.png` });
    await ctx.close();
  }
  await b.close(); srv.close();
})();
