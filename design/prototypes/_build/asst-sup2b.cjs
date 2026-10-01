const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.env.OUT;
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port; const U = `http://127.0.0.1:${port}/assistant.html`;
  const b = await chromium.launch(); const errs = [];
  const mk = async (W, opts = {}) => { const ctx = await b.newContext({ viewport: { width: W, height: W < 600 ? 844 : 800 }, ...opts }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text())); return [ctx, p]; };
  const act = p => p.evaluate(() => { const a = document.activeElement; return a.id || a.className || a.tagName; });
  // 1. shekel colour in dark
  let [ctx, p] = await mk(1280); await p.goto(U + '?lang=en&theme=dark'); await p.waitForTimeout(400);
  console.log('shekel', await p.evaluate(() => getComputedStyle(document.querySelector('.dc-price__now small')).color), await p.evaluate(() => getComputedStyle(document.querySelector('.dc-price__now')).color));
  // keyboard: tab to launcher, Enter, Escape
  await p.focus('#asst-launch'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); console.log('after open focus', await act(p));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); console.log('after esc focus', await act(p));
  // ask-here opens
  await p.click('#ask-here'); await p.waitForTimeout(300); console.log('askhere expanded', await p.getAttribute('#ask-here', 'aria-expanded'), 'focus', await act(p));
  // lang switch mid-stream
  await p.fill('#asst-in', 'what is inside?'); await p.press('#asst-in', 'Enter'); await p.waitForTimeout(1900);
  await p.evaluate(() => DC.toggleLang()); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/switch-mid.png` });
  console.log('after switch dir', await p.evaluate(() => document.dir), 'turns', await p.evaluate(() => [...document.querySelectorAll('.dc-asst-turn')].map(t => t.innerText.slice(0, 40).replace(/\n/g, ' | '))));
  await p.waitForTimeout(3000); console.log('busy chips disabled?', await p.evaluate(() => document.querySelector('.dc-asst-chip').disabled), 'typing left', await p.evaluate(() => document.querySelectorAll('[data-typing]').length));
  await ctx.close();
  // 2. mobile: focus trap & source link, inert
  [ctx, p] = await mk(390); await p.goto(U + '?lang=ar'); await p.waitForTimeout(400);
  await p.click('#asst-launch'); await p.waitForTimeout(400);
  console.log('page inert', await p.evaluate(() => document.getElementById('page').inert));
  const seq = []; for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seq.push(await act(p)); } console.log('tab seq', seq.join(' > '));
  await p.click('.dc-asst-chip[data-i="0"]'); await p.waitForTimeout(8000);
  await p.screenshot({ path: `${OUT}/m-inside.png` });
  await p.click('a.dc-msg__src'); await p.waitForTimeout(1200);
  console.log('after src', await act(p), 'open?', await p.evaluate(() => document.getElementById('asst').classList.contains('is-open')), 'contentsTop', await p.evaluate(() => Math.round(document.getElementById('contents').getBoundingClientRect().top)));
  await p.screenshot({ path: `${OUT}/m-after-src.png` });
  await ctx.close();
  // 3. reduced motion
  [ctx, p] = await mk(390, { reducedMotion: 'reduce' }); await p.goto(U + '?lang=en'); await p.waitForTimeout(300);
  await p.click('#asst-launch'); await p.waitForTimeout(80); await p.screenshot({ path: `${OUT}/rm-open.png` });
  await p.click('.dc-asst-chip[data-i="1"]'); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/rm-answer.png` });
  console.log('rm panel transition', await p.evaluate(() => getComputedStyle(document.getElementById('asst')).transitionDuration));
  await ctx.close();
  // 4. 360 width
  [ctx, p] = await mk(360); await p.goto(U + '?lang=ar&open=1&ask=' + encodeURIComponent('كم سعر الورشة؟')); await p.waitForTimeout(9000);
  await p.screenshot({ path: `${OUT}/360-ws.png` }); console.log('360 ov', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await ctx.close();
  // 5. 1440 + 768
  for (const W of [768, 1440]) { [ctx, p] = await mk(W); await p.goto(U + '?lang=ar&open=1'); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${W}-open.png` }); console.log(W, 'ov', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); await ctx.close(); }
  console.log('errors', JSON.stringify(errs)); await b.close(); srv.close();
})();
