const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  for (const W of [360, 390]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=ar&open=1`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const sub = await p.evaluate(() => { const s = document.querySelector('#asst-disc'); const r = s.getBoundingClientRect(); return { h: Math.round(r.height), lh: parseFloat(getComputedStyle(s).lineHeight) }; });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // chip (index 1) then switch language
    await p.click('.dc-asst-chip[data-i="1"]'); await p.waitForTimeout(6500);
    await p.evaluate(() => DC.setLang ? DC.setLang('en') : document.dispatchEvent(new Event('dc:lang')));
    const alt = await p.evaluate(() => document.documentElement.lang);
    await p.waitForTimeout(500);
    const bubbles = await p.evaluate(() => [...document.querySelectorAll('.dc-msg--me')].map(x => x.textContent));
    console.log(W, 'subtitle', JSON.stringify(sub), 'overflow', ov, 'lang', alt, 'me-bubbles', JSON.stringify(bubbles));
    const fs2 = await p.evaluate(() => getComputedStyle(document.querySelector('.dc-asst-contents b')).fontFamily.slice(0,30));
    console.log('qty font', fs2);
    await p.screenshot({ path: `${OUT}/assistant-${W}-rev1-switch.png` });
    await ctx.close();
  }
  // sessions book card in ar 390
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=ar&ask=${encodeURIComponent('كم سعر الجلسة؟')}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(7500);
  console.log('meta', await p.evaluate(() => document.querySelector('.dc-asst-card__meta').innerHTML));
  await p.screenshot({ path: `${OUT}/assistant-390-rev1-book.png` });
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
