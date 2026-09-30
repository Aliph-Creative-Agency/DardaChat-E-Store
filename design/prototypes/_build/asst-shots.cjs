const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  for (const W of (process.env.WS||"390,1280").split(",").map(Number)) for (const lang of (process.env.LANGS||"ar,en").split(",")) {
    const H = W === 390 ? 844 : 800;
    const ctx = await b.newContext({ viewport: { width: W, height: H } }); const p = await ctx.newPage();
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const base = `http://127.0.0.1:${port}/assistant.html?lang=${lang}`;
    const tag = `assistant-${W}-${lang}`;
    await p.goto(base, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-closed.png` });
    await p.goto(base + '&open=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-open.png` });
    await p.goto(base + '&ask=' + encodeURIComponent(lang === 'ar' ? 'شو بتنصحوا لقعدة أصدقاء؟' : 'What do you recommend for friends?'), { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/${tag}-typing.png` });
    await p.waitForTimeout(6500); await p.screenshot({ path: `${OUT}/${tag}-answer.png` });
    await p.goto(base + '&ask=' + encodeURIComponent(lang === 'ar' ? 'كم سعر الجلسة؟' : 'How much is a session?'), { waitUntil: 'networkidle' });
    await p.waitForTimeout(7500); await p.screenshot({ path: `${OUT}/${tag}-book.png` });
    await p.goto(base + '&ask=' + encodeURIComponent('xyz'), { waitUntil: 'networkidle' });
    await p.waitForTimeout(7500); await p.screenshot({ path: `${OUT}/${tag}-escalate.png` });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(tag, 'overflow', ov);
    await ctx.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
