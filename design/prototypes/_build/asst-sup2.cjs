const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.env.OUT;
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const CONTRAST = () => {
  const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return m; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bgOf = el => { while (el) { const c = getComputedStyle(el).backgroundColor; const p = parse(c); if (p.length === 3 || p[3] > 0.5) return p; el = el.parentElement; } return [255, 255, 255]; };
  const out = [];
  const sel = ['#asst-title', '#asst-disc', '.dc-asst-notice b', '.dc-asst-notice span', '.dc-msg--bot', '.dc-msg--me', '.dc-msg__src', '.dc-asst-chip', '.dc-asst-foot a', '.dc-asst-foot .dc-num', '.dc-asst-card__meta', '.dc-asst-card__name', '.dc-asst-card .dc-btn', '.dc-asst-card .dc-chip', '#asst-in', '.dc-asst-launch', '.dc-asst-card .dc-num'];
  sel.forEach(s => document.querySelectorAll(s).forEach((e, i) => { if (i > 1) return; const cs = getComputedStyle(e); const fg = parse(cs.color), bg = bgOf(e); const L1 = lum(fg), L2 = lum(bg.slice(0, 3)); const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); out.push(`${s}[${i}] ${cr.toFixed(2)} ${cs.fontSize} ${cs.fontWeight} fg=${cs.color}`); }));
  return out;
};
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  for (const W of [390, 1280]) for (const lang of ['ar', 'en']) for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: W, height: W === 390 ? 844 : 800 } }); const p = await ctx.newPage();
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    const tag = `${W}-${lang}-${theme}`;
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=${lang}&theme=${theme}`, { waitUntil: 'load' });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${tag}-closed.png` });
    await p.click('#asst-launch'); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}/${tag}-mid-open.png` });
    await p.waitForTimeout(1200);
    const brush = await p.evaluate(() => { const pa = document.querySelector('#asst-brush path'), pr = pa.getBoundingClientRect(), hr = document.querySelector('.dc-asst-head').getBoundingClientRect(); return [pr.left, pr.right, pr.top, pr.bottom, hr.left, hr.right, hr.bottom].map(Math.round); });
    await p.screenshot({ path: `${OUT}/${tag}-open.png` });
    // chip 2: session price (book card)
    await p.click('.dc-asst-chip[data-i="2"]'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-typing.png` });
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${OUT}/${tag}-book.png` });
    // friends -> product card
    await p.fill('#asst-in', lang === 'ar' ? 'شو بتنصحوا لقعدة أصدقاء؟' : 'What do you recommend for friends?'); await p.press('#asst-in', 'Enter');
    await p.waitForTimeout(8000);
    await p.screenshot({ path: `${OUT}/${tag}-card.png` });
    // escalate
    await p.fill('#asst-in', lang === 'ar' ? 'كم بياخد التوصيل؟' : 'How long does delivery take?'); await p.press('#asst-in', 'Enter');
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `${OUT}/${tag}-esc.png` });
    const c = await p.evaluate(CONTRAST);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const panelOv = await p.evaluate(() => { const l = document.querySelector('#asst-log'); return [l.scrollWidth - l.clientWidth, [...l.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), lr = l.getBoundingClientRect(); return r.width && (r.right > lr.right + 1 || r.left < lr.left - 1); }).map(e => e.className).slice(0, 5)]; });
    console.log(tag, 'brush', JSON.stringify(brush), 'ov', ov, 'panelOv', JSON.stringify(panelOv));
    if (lang === 'ar' && theme === 'light' || theme === 'dark' && lang === 'en') console.log(c.join('\n'));
    await ctx.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
