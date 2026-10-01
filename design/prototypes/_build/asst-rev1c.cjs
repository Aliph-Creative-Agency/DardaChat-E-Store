const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch();
  for (const W of [360, 390]) for (const lang of ['ar', 'en']) {
    const p = await (await b.newContext({ viewport: { width: W, height: 800 } })).newPage();
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=${lang}&open=1`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    console.log(W, lang, await p.evaluate(() => Math.round(document.querySelector('#asst-disc').getBoundingClientRect().height)), 'foot-num', await p.evaluate(() => getComputedStyle(document.querySelector('.dc-asst-foot .dc-num')).display));
  }
  await b.close(); srv.close();
})();
