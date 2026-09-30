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
    const base = `http://127.0.0.1:${port}/assistant.html?lang=${lang}&theme=${theme}`;
    const tag = `assistant-${W}-${lang}-${theme}`;
    await p.goto(base + '&open=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
    const m = await p.evaluate(() => {
      const pa = document.querySelector('#asst-brush path'), pr = pa.getBoundingClientRect(), hr = document.querySelector('.dc-asst-head').getBoundingClientRect(), br = document.querySelector('#asst-brush').getBoundingClientRect();
      return { path: [Math.round(pr.left), Math.round(pr.right)], head: [Math.round(hr.left), Math.round(hr.right)], svgBottom: Math.round(br.bottom), headBottom: Math.round(hr.bottom), off: getComputedStyle(pa).strokeDashoffset, len: pa.style.getPropertyValue('--len') };
    });
    console.log(tag, JSON.stringify(m));
    await p.screenshot({ path: `${OUT}/${tag}-open.png` });
    // full flow: a few turns for scrolled-under check
    for (const q of (lang === 'ar' ? ['كم سعر الجلسة؟', 'شو بتنصحوا لقعدة أصدقاء؟', 'xyz'] : ['How much is a session?', 'What do you recommend for friends?', 'xyz'])) {
      await p.fill('#asst-in', q); await p.press('#asst-in', 'Enter');
      await p.waitForFunction(() => !document.querySelector('#asst-in').disabled || document.querySelector('.dc-asst-chip:not([disabled])') , null, { timeout: 15000 }).catch(()=>{});
      await p.waitForTimeout(6500);
    }
    await p.evaluate(() => { const l = document.querySelector('#asst-log'); l.style.scrollBehavior='auto'; l.scrollTop = l.scrollHeight * 0.55; });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-scrolled.png` });
    await p.evaluate(() => { const l = document.querySelector('#asst-log'); l.scrollTop = l.scrollHeight; });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-answer.png` });
    console.log(tag, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    await ctx.close();
  }
  // mobile: in-page source closes the sheet and scrolls
  for (const lang of ['ar', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=${lang}&open=1&ask=${encodeURIComponent(lang==='ar'?'شو في داخل الصندوق؟':"What's inside the box?")}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(8000);
    await p.click('#asst-log a.dc-msg__src'); await p.waitForTimeout(1200);
    console.log('src-click', lang, JSON.stringify(await p.evaluate(() => ({ open: document.querySelector('#asst').classList.contains('is-open'), inert: document.querySelector('#page').inert, top: Math.round(document.querySelector('#contents').getBoundingClientRect().top), scrollY: Math.round(scrollY), focus: document.activeElement.id }))));
    if (lang === 'ar') await p.screenshot({ path: `${OUT}/assistant-390-ar-src.png` });
    await ctx.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
