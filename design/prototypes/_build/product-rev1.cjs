// Product revision 1 QA. Run from D:/Personal/Projects/DardaChat-E-store/web:  node ../design/prototypes/_build/product-rev1.cjs
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'shots');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  async function open(w, h, qs, opts) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: (opts && opts.reduce) ? 'reduce' : 'no-preference', hasTouch: w < 600, isMobile: w < 600 });
    const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && errs.push(w + ' ' + qs + ' ' + m.text())); p.on('pageerror', e => errs.push(w + ' ' + qs + ' ' + e));
    await p.goto('http://127.0.0.1:' + port + '/product.html?' + qs, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); return p;
  }
  const toInside = async (p, off = 40) => { await p.evaluate(o => window.scrollTo(0, document.querySelector('#xv').getBoundingClientRect().top + scrollY - o), off); await p.waitForTimeout(2200); };
  const shot = async (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  const ovf = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const res = {};

  // ---- 1280 en inside, hover on the third row
  let p = await open(1280, 800, 'lang=en');
  await toInside(p, 100);
  await p.hover('.dc-pdp-row[data-part="secret"]'); await p.waitForTimeout(900); await shot(p, 'product-1280-en-inside');
  res.ageChip1280en = await p.evaluate(() => [document.querySelector('#chips .dc-chip--age').textContent, document.querySelector('#factAge').textContent]);
  res.capText = await p.evaluate(() => document.querySelector('#xvCapPill').innerText);
  res.pieceSizes1280 = await p.evaluate(() => [...document.querySelectorAll('.dc-pdp-part .in')].map(g => { const r = g.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  res.ovf1280 = await ovf(p); await p.close();
  // ---- 1280 ar, hover
  p = await open(1280, 800, ''); await toInside(p, 100); await p.hover('.dc-pdp-row[data-part="secret"]'); await p.waitForTimeout(900); await shot(p, 'product-1280-ar-inside');
  res.capTextAr = await p.evaluate(() => document.querySelector('#xvCapPill').innerText); await p.close();
  // ---- 1280 night
  p = await open(1280, 800, 'theme=dark'); await toInside(p, 100); await p.hover('.dc-pdp-row[data-part="hearts"]'); await p.waitForTimeout(900); await shot(p, 'product-1280-dark-inside');
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); await shot(p, 'product-1280-dark'); await p.close();

  // ---- 390
  p = await open(390, 844, ''); await shot(p, 'product-390-top');
  res.mobileTop = await p.evaluate(() => { const t = s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }; return { name: t('#pName'), chips: t('#chips'), price: t('#unitPrice'), addBtn: t('#addBtn'), stage: t('#stage') }; });
  await toInside(p, 80);
  await shot(p, 'product-390-inside');
  res.sticky = await p.evaluate(() => { const x = document.querySelector('#xv').getBoundingClientRect(); return { top: Math.round(x.top), h: Math.round(x.height), bottom: Math.round(x.bottom) }; });
  await p.evaluate(() => { const r = document.querySelector('.dc-pdp-row'); scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await p.waitForTimeout(700);
  const row3 = await p.$('.dc-pdp-row[data-part="msg"]'); await row3.tap(); await p.waitForTimeout(1200); if (!(await p.$('.dc-pdp-row[aria-pressed=true]'))) { await row3.tap(); await p.waitForTimeout(1200); }
  res.afterTap = await p.evaluate(() => { const x = document.querySelector('#xv').getBoundingClientRect(), r = document.querySelector('.dc-pdp-row[aria-pressed=true]').getBoundingClientRect(); return { xvBottom: Math.round(x.bottom), rowTop: Math.round(r.top), rowBottom: Math.round(r.bottom), gap: Math.round(r.top - x.bottom) }; });
  await shot(p, 'product-390-inside-tap');
  res.probe = [];
  for (const y of [1400, 1700, 2000]) {
    await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(500);
    res.probe.push(await p.evaluate(() => { const x = document.querySelector('#xv').getBoundingClientRect(), r = document.querySelector('.dc-pdp-row[aria-pressed=true]'); if (!r) return null; const b = r.getBoundingClientRect(); return { xvBottom: Math.round(x.bottom), rowTop: Math.round(b.top), part: r.dataset.part }; }));
  }
  await shot(p, 'product-390-inside-scroll');
  await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(600); await shot(p, 'product-390-bar');
  res.ovf390 = await ovf(p); await p.close();
  p = await open(390, 844, 'lang=en'); await shot(p, 'product-390-en-top'); await toInside(p, 80); await shot(p, 'product-390-en-inside'); await p.close();
  // night 390
  p = await open(390, 844, 'theme=dark'); await shot(p, 'product-390-dark-top'); await toInside(p, 80); await p.tap('.dc-pdp-row[data-part="deck-pink"]'); await p.waitForTimeout(800); await shot(p, 'product-390-dark-inside'); await p.close();
  // ramadan
  p = await open(390, 844, 'box=ramadan'); await shot(p, 'product-390-ramadan-top'); await toInside(p, 80); await p.tap('.dc-pdp-row >> nth=1'); await p.waitForTimeout(900); await shot(p, 'product-390-ramadan');
  res.ovfRam = await ovf(p); await p.close();
  p = await open(1280, 800, 'box=ramadan&lang=en'); await shot(p, 'product-1280-ramadan-en');
  res.ramadanNote = await p.evaluate(() => getComputedStyle(document.querySelector('.dc-pdp-off__note')).color); await p.close();
  p = await open(390, 844, '', { reduce: true }); await toInside(p, 80); await shot(p, 'product-390-reduce'); res.ovfReduce = await ovf(p); await p.close();
  for (const bx of ['dardachat', 'whoamong']) { p = await open(1280, 800, 'box=' + bx + '&lang=en'); await toInside(p, 100); await p.hover('.dc-pdp-row >> nth=1'); await p.waitForTimeout(900); await shot(p, 'product-1280-' + bx + '-inside'); await p.close(); }
  p = await open(390, 844, 'box=dardachat&lang=en'); await toInside(p, 80); await shot(p, 'product-390-dardachat-inside'); await p.close();
  console.log(JSON.stringify(res, null, 1)); console.log('errors', JSON.stringify(errs));
  await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
