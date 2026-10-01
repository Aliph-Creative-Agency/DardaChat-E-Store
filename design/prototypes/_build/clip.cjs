// clip.cjs <w> <lang> <theme> <selector> <out.png> : element screenshot after scrolling (scratch helper)
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  const [w, lang, theme, sel, out, h] = process.argv.slice(2);
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: +w, height: +(h || 800) } }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/services.html?lang=${lang}${theme === 'dark' ? '&theme=dark' : ''}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '.dc-svc-top,.dc-svc-sub{position:static!important}.dc-proto-bar{display:none!important}.dc-rv{opacity:1!important;animation:none!important}' });
  await p.locator(sel).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await p.locator(sel).first().screenshot({ path: out });
  await b.close(); srv.close();
})();
