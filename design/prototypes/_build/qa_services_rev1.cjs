// rev1 measurements. Run from web/: node ../design/prototypes/_build/qa_services_rev1.cjs
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const b = await chromium.launch(); const out = [];
  for (const w of [360, 390, 768, 1024, 1280]) for (const lang of ['ar', 'en']) for (const theme of ['light', 'dark']) {
    if (theme === 'dark' && w !== 1280 && w !== 390) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } }); const p = await ctx.newPage(); const errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(`http://127.0.0.1:${srv.address().port}/services.html?lang=${lang}${theme === 'dark' ? '&theme=dark' : ''}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const de = document.documentElement, q = s => [...document.querySelectorAll(s)];
      const sub = document.querySelector('.dc-svc-sub .dc-page');
      const ctas = q('#wsGrid .dc-svc-card > .dc-btn').map(a => Math.round(a.getBoundingClientRect().top + scrollY));
      const wraps = q('.dc-service__facts dd, .dc-svc-stats dd').filter(d => d.getClientRects().length && d.getBoundingClientRect().height > 1.9 * parseFloat(getComputedStyle(d).lineHeight)).map(d => d.textContent);
      const ph = q('.dc-ph').map(e => { const cs = getComputedStyle(e); return [cs.color, cs.backgroundColor]; });
      const deck = document.querySelector('.dc-svc-deck .dc-qcard').getBoundingClientRect().width;
      const art = document.querySelector('.dc-svc-art').getBoundingClientRect();
      return { h: de.scrollHeight, ovf: de.scrollWidth - de.clientWidth, subScroll: sub.scrollWidth - sub.clientWidth, ctas, wraps, ph, deck: Math.round(deck), art: Math.round(art.width) + 'x' + Math.round(art.height), wa: document.querySelector('a[data-wa][data-msg-ar]') && decodeURIComponent(document.querySelector('a[data-msg-ar]').href.split('text=')[1]) };
    });
    r.ph = r.ph.map(([c, bg]) => { const L1 = lum(rgb(c)), L2 = lum(rgb(bg)); return ((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)).toFixed(2); }).filter((v, i, a) => a.indexOf(v) === i);
    out.push({ w, lang, theme, ...r, errs });
    await ctx.close();
  }
  for (const o of out) console.log(JSON.stringify(o));
  await b.close(); srv.close();
})();
