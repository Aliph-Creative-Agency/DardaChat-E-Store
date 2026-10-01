const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=en&open=1`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(() => ['#asst', '#asst-log', '.dc-asst-foot', '#asst-form', '.dc-asst-head'].map(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(), c = getComputedStyle(e); return [s, Math.round(r.left), Math.round(r.right), c.paddingLeft, c.paddingRight, c.boxSizing]; }))));
  await b.close(); srv.close();
})();
