const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const report = [];
  for (const [w, h] of [[390, 844], [1280, 800]]) for (const lang of ['ar', 'en']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(`http://127.0.0.1:${port}/cart-checkout.html?lang=${lang}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const tag = `cart-checkout-${w}-${lang}`;
    const shot = async (n, full) => { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${tag}-${n}.png`, fullPage: !!full }); report.push(`${tag}-${n} overflow=${0}`); };
    const ov = async n => report.push(`${tag} ${n} overflowPx=` + await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    await shot('1-shelf'); await ov('shelf');
    await p.evaluate(() => { location.hash = 'cart'; }); await shot('2-drawer'); await ov('drawer');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.evaluate(() => { location.hash = 'checkout'; }); await shot('3-cart', true); await ov('cart');
    await p.click('#next0'); await p.waitForTimeout(500);
    await p.click('#next0.x, #p1 button[type=submit]').catch(()=>{}); await shot('4-address-errors', true);
    await p.fill('#f-name', lang === 'ar' ? 'ليلى خليل' : 'Layla Khalil'); await p.fill('#f-phone', '0543992424');
    await p.fill('#f-city', lang === 'ar' ? 'رام الله' : 'Ramallah'); await p.fill('#f-area', lang === 'ar' ? 'الماصيون' : 'Masyoun'); await p.fill('#f-street', lang === 'ar' ? 'شارع الإرسال، بناية 4، الطابق 2' : 'Irsal St, building 4, floor 2');
    await shot('5-address-filled', true); await ov('address');
    await p.click('#p1 button[type=submit]'); await p.waitForTimeout(600); await shot('6-delivery', true); await ov('delivery');
    await p.click('#zoneOpts label >> nth=0'); await p.waitForTimeout(300);
    await p.click('#p2 button[type=submit]'); await p.waitForTimeout(600);
    await p.click('#payOpts label >> nth=0'); await p.waitForTimeout(300); await shot('7-payment', true); await ov('payment');
    await p.check('#terms', { force: true }); await p.click('#confirmBtn'); await p.waitForTimeout(3500); await shot('8-done', true); await ov('done');
    report.push(`${tag} errors=` + JSON.stringify(errs));
    await ctx.close();
  }
  console.log(report.join('\n')); await b.close(); srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
