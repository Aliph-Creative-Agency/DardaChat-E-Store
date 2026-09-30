const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..');
const MT={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':MT[path.extname(f)]||'application/octet-stream'});r.end(d)})});
(async()=>{await new Promise(o=>srv.listen(0,'127.0.0.1',o));const port=srv.address().port;const b=await chromium.launch();
const OUT=path.join(ROOT,'shots');const errs=[];const rep=[];
for(const f of fs.readdirSync(OUT)) if(/^shop-/.test(f)) fs.unlinkSync(path.join(OUT,f));
for(const [w,h] of [[390,844],[1280,800]]) for(const lang of ['ar','en']) for(const theme of ['light','dark']){
 const tag=`${w}-${lang}-${theme}`;const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push(tag+' '+String(e)));p.on('console',m=>m.type()==='error'&&errs.push(tag+' '+m.text()));p.on('requestfailed',r=>errs.push(tag+' reqfail '+r.url()));p.on('response',r=>r.status()>=400&&errs.push(tag+' '+r.status()+' '+r.url()));
 await p.goto(`http://127.0.0.1:${port}/shop.html?lang=${lang}${theme==='dark'?'&theme=dark':''}`,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
 await p.screenshot({path:path.join(OUT,`shop-${tag}-top.png`)});
 const m=await p.evaluate(()=>{const de=document.documentElement,vw=de.clientWidth;
  const clear=document.getElementById('clearBtn');const cs=getComputedStyle(clear);
  const first=document.querySelector('.dc-shop-item:not([hidden]) .dc-product__name').getBoundingClientRect();
  const card=document.querySelector('.dc-shop-item .dc-product').getBoundingClientRect();
  const price=document.querySelector('.dc-shop-item .dc-price__now').getBoundingClientRect(),vat=document.querySelector('.dc-shop-item .dc-price__vat').getBoundingClientRect();
  const rtl=de.dir==='rtl';
  let out=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('.dc-shop-chips')||e.closest('.dc-shop-toast')||e.closest('nav'))return;const r=e.getBoundingClientRect();if(r.width&&(r.left<-1||r.right>vw+1))out.push(e.className&&e.className.baseVal===undefined?e.className:e.tagName)});
  return {ovX:de.scrollWidth-vw,clearDisplay:cs.display,clearFocusable:clear.tabIndex>=0&&cs.display!=='none',nameBottom:Math.round(first.bottom),
   priceEdgeGap:Math.round(rtl?card.right-price.right:price.left-card.left),vatEdgeGap:Math.round(rtl?card.right-vat.right:vat.left-card.left),outside:out.slice(0,5),
   fan:!!document.querySelector('.dc-shop-fan')&&getComputedStyle(document.querySelector('.dc-shop-fan')).display};});
 rep.push(tag+' '+JSON.stringify(m));
 rep.push(tag+' rowsEnd(fit rows without is-end) '+JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.dc-shop-chips')].filter(r=>r.scrollWidth<=r.clientWidth&&!r.classList.contains('is-end')).length)));
 // scroll-to-cards / hover / add
 const card=p.locator('.dc-shop-item').first();await card.scrollIntoViewIfNeeded();await card.hover();await p.waitForTimeout(600);
 await p.screenshot({path:path.join(OUT,`shop-${tag}-hover.png`)});
 await p.locator('[data-add]').first().click();await p.waitForTimeout(500);
 const lbl=await p.evaluate(()=>{const b=document.querySelector('[data-add]');return [b.classList.contains('is-added'),getComputedStyle(b.querySelector('.l-done')).visibility,getComputedStyle(b.querySelector('.i-tick')).display]});
 rep.push(tag+' addstate '+JSON.stringify(lbl));
 await p.screenshot({path:path.join(OUT,`shop-${tag}-add.png`)});await p.waitForTimeout(1500);
 const after=await p.evaluate(()=>[document.querySelector('[data-add]').classList.contains('is-added'),document.getElementById('cartCount').textContent]);rep.push(tag+' after1.3s '+JSON.stringify(after));
 // filter
 const chip=p.locator('.dc-shop-fchip[data-key="age"][data-val="18"]');await chip.scrollIntoViewIfNeeded();await chip.click();await p.waitForTimeout(800);
 const fs2=await p.evaluate(()=>[getComputedStyle(document.getElementById('clearBtn')).display,document.querySelectorAll('.dc-shop-item:not([hidden])').length]);rep.push(tag+' filtered clearDisplay,visible '+JSON.stringify(fs2));
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,`shop-${tag}-filter.png`)});
 // empty state
 await p.locator('.dc-shop-fchip[data-key="season"][data-val="ramadan"]').click();await p.waitForTimeout(1200);
 await p.screenshot({path:path.join(OUT,`shop-${tag}-empty.png`)});
 await p.locator('#emptyClear').click();await p.waitForTimeout(700);
 // couples -> all glide: sample horizontal overflow every 50ms
 await p.evaluate(()=>window.scrollTo(0,0));
 const cp=p.locator('.dc-shop-fchip[data-key="audience"]').nth(1);await cp.scrollIntoViewIfNeeded();await cp.click();await p.waitForTimeout(900);
 await p.evaluate(()=>{window.__ov=0;const de=document.documentElement;window.__t=setInterval(()=>{window.__ov=Math.max(window.__ov,de.scrollWidth-de.clientWidth,document.body.scrollWidth-de.clientWidth)},50)});
 await p.locator('.dc-shop-fchip[data-key="audience"][data-val="any"]').click();await p.waitForTimeout(900);
 rep.push(tag+' glideMaxOverflow(expect 0) '+await p.evaluate(()=>{clearInterval(window.__t);return window.__ov}));
 // out-of-season note + notify
 const nb=p.locator('[data-notify]');await nb.scrollIntoViewIfNeeded();await nb.click();await p.waitForTimeout(400);
 await p.screenshot({path:path.join(OUT,`shop-${tag}-notify.png`)});
 rep.push(tag+' notifyPressed h,lines '+JSON.stringify(await p.evaluate(()=>{const b=document.querySelector('[data-notify]');return [Math.round(b.getBoundingClientRect().height),getComputedStyle(b).whiteSpace]})));
 rep.push(tag+' ovX-final '+await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
 await ctx.close();
}
// rev1: menu opened while the toast is showing (390): toast must be hidden and sit below the header
for(const lang of ['ar','en']){
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('menu '+String(e)));
 await p.goto(`http://127.0.0.1:${port}/shop.html?lang=${lang}`,{waitUntil:'networkidle'});await p.waitForTimeout(800);
 const btn=p.locator('[data-add]').first();await btn.scrollIntoViewIfNeeded();await btn.click();await p.waitForTimeout(1100);
 const toastOn=await p.evaluate(()=>document.getElementById('toast').classList.contains('is-on'));
 const toastTxt=await p.evaluate(()=>{const t=document.getElementById('toastText');return [t.textContent,Math.round(t.getBoundingClientRect().height/parseFloat(getComputedStyle(t).lineHeight))]});
 await p.screenshot({path:path.join(OUT,`shop-390-${lang}-toast.png`)});
 await p.locator('#menuBtn').click();await p.waitForTimeout(500);
 const r=await p.evaluate(()=>{const t=document.getElementById('toast');const cs=getComputedStyle(t);return {toastOn:t.classList.contains('is-on'),vis:cs.visibility,z:cs.zIndex,headerZ:getComputedStyle(document.querySelector('.dc-shop-top')).zIndex,navOpen:document.getElementById('dc-nav').classList.contains('is-open')}});
 rep.push(`menu-with-toast ${lang} toastBefore=${toastOn} text/lines=${JSON.stringify(toastTxt)} after=${JSON.stringify(r)} PASS=${!r.toastOn&&r.vis==='hidden'&&r.navOpen&&+r.z<+r.headerZ}`);
 await p.screenshot({path:path.join(OUT,`shop-390-${lang}-menu-toast.png`)});
 await ctx.close();
}
// rev1: real touch: tap Add, after 1.3s the lid and card must be back to rest (transform none)
for(const lang of ['ar','en']){
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();
 await p.goto(`http://127.0.0.1:${port}/shop.html?lang=${lang}`,{waitUntil:'networkidle'});await p.waitForTimeout(800);
 const btn=p.locator('[data-add]').first();await btn.scrollIntoViewIfNeeded();await btn.tap();await p.waitForTimeout(1300);
 const r=await p.evaluate(()=>{const c=document.querySelector('.dc-shop-item .dc-product');return {lid:getComputedStyle(c.querySelector('.dc-product__lid')).transform,peek:getComputedStyle(c.querySelector('.dc-product__peek')).transform,card:getComputedStyle(c).transform,focusedBtn:!!(document.activeElement&&document.activeElement.hasAttribute('data-add')),hoverHover:matchMedia('(hover:hover)').matches}});
 rep.push(`touch-tap ${lang} ${JSON.stringify(r)} PASS=${r.lid==='none'&&r.peek==='none'&&r.card==='none'}`);
 await p.screenshot({path:path.join(OUT,`shop-390-${lang}-touch-after-tap.png`)});
 await ctx.close();
}
console.log(rep.join('\n'));console.log('ERRORS',JSON.stringify(errs));await b.close();srv.close()})();
