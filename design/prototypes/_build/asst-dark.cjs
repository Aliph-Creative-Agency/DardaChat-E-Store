const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port; const b = await chromium.launch(); const errs = [];
  let ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/assistant.html?theme=dark&ask=${encodeURIComponent('كم سعر الجلسة؟')}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(7000);
  await p.screenshot({ path: `${OUT}/assistant-390-ar-dark.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  console.log('esc closes:', await p.evaluate(() => !document.querySelector('#asst').classList.contains('is-open')), 'focus:', await p.evaluate(() => document.activeElement.id));
  await ctx.close();
  ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=en&ask=${encodeURIComponent('recommend for friends')}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/assistant-1280-en-reduce.png` });
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
