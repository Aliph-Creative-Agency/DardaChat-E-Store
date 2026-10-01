const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const QS = [
 ['ar','فيه خصم؟'],['ar','هل فيه دفع عند الاستلام؟'],['en','Does the price include delivery?'],['ar','هل البطاقات بالإنجليزي؟'],
 ['en','Is there a family discount?'],['ar','بقعد قديش التوصيل'],['ar','هل الصندوق مناسب لعمر 16؟'],['en','What age is it for?'],
 ['ar','شو في داخل الصندوق؟'],['en',"What's inside the box?"],['ar','شو بتنصحوا لقعدة أصدقاء؟'],['en','A gift for my relationship'],['ar','كم سعر الجلسة؟']];
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  for (const [lang, q] of QS) {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(`http://127.0.0.1:${port}/assistant.html?lang=${lang}&ask=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1800);
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.dc-asst-turn--bot')].pop(); return t.querySelector('.dc-asst-txt').textContent.slice(0, 55) + ' | card:' + (t.querySelector('.dc-asst-card__name') || {}).textContent; });
    console.log(lang, q, '=>', r); await p.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
