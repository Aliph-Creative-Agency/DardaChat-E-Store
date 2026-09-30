const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  for (const W of [390, 1280]) for (const lang of ['ar', 'en']) for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: W, height: W === 390 ? 844 : 800 } }); const p = await ctx.newPage();
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const tag = `assistant-${W}-${lang}-${theme}`;
    const q = lang === 'ar' ? 'كم سعر الجلسة؟' : 'How much is a session?';
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=${lang}&theme=${theme}&open=1&ask=${encodeURIComponent(q)}`, { waitUntil: 'load' });
    await p.waitForTimeout(1800);
    const m = await p.evaluate(() => { const pa = document.querySelector('#asst-brush path'), pr = pa.getBoundingClientRect(), hr = document.querySelector('.dc-asst-head').getBoundingClientRect(); return { path: [Math.round(pr.left), Math.round(pr.right)], head: [Math.round(hr.left), Math.round(hr.right)] }; });
    console.log(tag, JSON.stringify(m));
    await p.screenshot({ path: `${OUT}/${tag}-open.png` });
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `${OUT}/${tag}-answer.png` });
    console.log(tag, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    await ctx.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
