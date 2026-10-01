/* Dardachat prototypes — _shared.js
   Tiny helpers every screen may use. No dependencies. Load with:
     <script src="_shared.js" defer></script>
   API (window.DC):
     DC.lang            'ar' | 'en'         DC.setLang('en') / DC.toggleLang()
     DC.theme           'light' | 'dark'    DC.setTheme('dark') / DC.toggleTheme()
     DC.reducedMotion() true when the OS asks for reduced motion (the OS setting is the only source)
     DC.t(ar, en)       pick a string for the current language (for text built in JS)
     DC.restart(el, cls) remove + reflow + re-add a class (re-runs a CSS animation)
     DC.go(url)         navigate with the short page-transition veil (same-site link clicks use it automatically)
     DC.cart            shared session cart: .count() .lines() .set(id, qty) .add(id, qty) .open() .close()  (+ 'dc:cart' event)
     DC.heartPop(btn)   .dc-btn[data-pop] heart pop        DC.bump(el)  cart-count bump
     DC.flip(card)      toggle .dc-qcard (keeps aria-pressed in sync)
     DC.draw(svg)       brush draw-on: measures each path, sets --len, adds .is-drawing
     DC.num(n, d)       Latin digits, fixed decimals ('149.00')
   Events on document: 'dc:lang' {lang}, 'dc:theme' {theme}, 'dc:motion' {reduced}, 'dc:cart' {count}.
   Markup conventions:
     <h1 data-ar="نحكي، نلعب، نقرّب" data-en="Talk, play, get closer">نحكي، نلعب، نقرّب</h1>
       text is replaced with the current language's attribute (put the Arabic in the markup too, so it reads without JS)
     data-ar-label / data-en-label             -> aria-label
     data-ar-placeholder / data-en-placeholder -> placeholder
     data-ar-title / data-en-title             -> title
     data-ar-alt / data-en-alt                 -> alt
     data-ar-html / data-en-html               -> innerHTML (only for trusted, authored markup)
     data-only="ar" | "en"                     -> whole block shown only in that language (CSS in ds.css)
     <title data-ar="…" data-en="…">            -> document title swaps too
   State is kept in the URL (?lang=en&theme=dark) so links between screens keep it,
   and in localStorage as a per-viewer convenience (wrapped in try/catch).
   Round 2 (shell): every page header gets a theme button and a language button (injected here);
   the old floating toolbar is gone; a shared cart drawer, page transitions and the assistant-widget
   loader live here too. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'dc-proto';
  var CART_KEY = 'dc-proto-cart';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: function () {} };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ lang: DC.lang, theme: DC.theme })); } catch (e) {} }
  var q = new URLSearchParams(location.search);
  var stored = load();

  var DC = window.DC = {
    lang: (q.get('lang') || stored.lang || root.getAttribute('lang') || 'ar') === 'en' ? 'en' : 'ar',
    theme: (q.get('theme') || stored.theme || root.getAttribute('data-theme') || 'light') === 'dark' ? 'dark' : 'light'
  };

  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }

  /* a relative page link keeps the language and theme the visitor chose */
  function carry(u) {
    DC.lang === 'en' ? u.searchParams.set('lang', 'en') : u.searchParams.delete('lang');
    DC.theme === 'dark' ? u.searchParams.set('theme', 'dark') : u.searchParams.delete('theme');
    u.searchParams.delete('motion');
    return u;
  }
  function syncUrl() {
    try { history.replaceState(history.state, '', carry(new URL(location.href))); } catch (e) {}
    document.querySelectorAll('a[href$=".html"], a[href*=".html?"], a[href*=".html#"]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (/^[a-z]+:/i.test(raw)) return;
      var h = raw.split('#'), base = h[0].split('?')[0], p = new URLSearchParams(h[0].split('?')[1] || '');
      p.delete('motion');
      DC.lang === 'en' ? p.set('lang', 'en') : p.delete('lang');
      DC.theme === 'dark' ? p.set('theme', 'dark') : p.delete('theme');
      var s = p.toString();
      a.setAttribute('href', base + (s ? '?' + s : '') + (h[1] ? '#' + h[1] : ''));
    });
  }

  /* ---------- language ---------- */
  var ATTRS = [['label', 'aria-label'], ['placeholder', 'placeholder'], ['title', 'title'], ['alt', 'alt']];
  function applyLang(scope) {
    var L = DC.lang, s = scope || document;
    root.setAttribute('lang', L);
    root.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr');
    s.querySelectorAll('[data-' + L + ']').forEach(function (el) { el.textContent = el.getAttribute('data-' + L); });
    s.querySelectorAll('[data-' + L + '-html]').forEach(function (el) { el.innerHTML = el.getAttribute('data-' + L + '-html'); });
    ATTRS.forEach(function (pair) {
      s.querySelectorAll('[data-' + L + '-' + pair[0] + ']').forEach(function (el) { el.setAttribute(pair[1], el.getAttribute('data-' + L + '-' + pair[0])); });
    });
    // .dc-root carries its own dir in the bundle; keep any on the page in step
    s.querySelectorAll('.dc-root').forEach(function (el) { el.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr'); });
  }
  DC.setLang = function (L) { DC.lang = L === 'en' ? 'en' : 'ar'; applyLang(); save(); syncUrl(); paintHeader(); drawerOnLang(); emit('dc:lang', { lang: DC.lang }); };
  DC.toggleLang = function () { DC.setLang(DC.lang === 'ar' ? 'en' : 'ar'); };
  DC.t = function (ar, en) { return DC.lang === 'en' ? en : ar; };
  DC.applyLang = applyLang; // call on content you inject later: DC.applyLang(container)

  /* ---------- theme ---------- */
  function applyTheme() { DC.theme === 'dark' ? root.setAttribute('data-theme', 'dark') : root.removeAttribute('data-theme'); }
  DC.setTheme = function (t) { DC.theme = t === 'dark' ? 'dark' : 'light'; applyTheme(); save(); syncUrl(); paintHeader(); emit('dc:theme', { theme: DC.theme }); };
  DC.toggleTheme = function () { DC.setTheme(DC.theme === 'dark' ? 'light' : 'dark'); };

  /* ---------- reduced motion: the OS setting only ---------- */
  DC.reducedMotion = function () { return !!mq.matches; };
  DC.setMotion = function () { /* retired: reduced motion follows the OS setting only */ };
  if (mq.addEventListener) mq.addEventListener('change', function () { emit('dc:motion', { reduced: DC.reducedMotion() }); });

  /* ---------- motion helpers (all cut to the end state when reduced) ---------- */
  DC.restart = function (el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  DC.heartPop = function (btn) { if (!DC.reducedMotion()) DC.restart(btn, 'is-popped'); };
  DC.bump = function (el) { if (!DC.reducedMotion()) DC.restart(el, 'is-bumped'); };
  DC.flip = function (card, force) {
    var on = card.classList.toggle('is-flipped', force);
    card.setAttribute('aria-pressed', String(on));
    return on;
  };
  DC.draw = function (svg) {
    if (!svg) return;
    svg.querySelectorAll('path').forEach(function (p) {
      try { p.style.setProperty('--len', String(Math.ceil(p.getTotalLength()) + 2)); } catch (e) {}
    });
    DC.restart(svg, 'is-drawing'); // ds.css cuts to stroke-dashoffset:0 when reduced
  };
  DC.num = function (n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); };

  /* ---------- header buttons: theme + language, on every page ---------- */
  var HEADERS = '.dc-home-top, .dc-shop-top, .dc-pdp-top, .dc-svc-top, .dc-co-bar, .dc-jr-head, .dc-asst-band';
  var ICON_MOON = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var ICON_SUN = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';
  function mountHeader() {
    document.querySelectorAll(HEADERS).forEach(function (h) {
      if (h.querySelector('.dc-hbtns')) return;
      var anchor = h.querySelector('.dc-cart') || h.querySelector('.dc-jr-sound');
      var box = document.createElement('span');
      box.className = 'dc-hbtns';
      box.innerHTML = '<button type="button" class="dc-hbtn dc-hbtn--theme" data-dc="theme">' + ICON_MOON + ICON_SUN + '</button>' +
        '<button type="button" class="dc-hbtn dc-hbtn--lang" data-dc="lang"><span aria-hidden="true"></span></button>';
      if (anchor) anchor.parentNode.insertBefore(box, anchor); else (h.querySelector('.dc-header, .dc-page') || h).appendChild(box);
    });
    paintHeader();
  }
  function paintHeader() {
    var ar = DC.lang === 'ar', dark = DC.theme === 'dark';
    document.querySelectorAll('.dc-hbtn--theme').forEach(function (b) {
      var l = dark ? (ar ? 'الوضع الفاتح' : 'Switch to light mode') : (ar ? 'الوضع الليلي' : 'Switch to night mode');
      b.setAttribute('aria-label', l); b.setAttribute('title', l);
    });
    document.querySelectorAll('.dc-hbtn--lang').forEach(function (b) {
      var l = ar ? 'English' : 'العربية';
      b.setAttribute('aria-label', l); b.setAttribute('title', l); b.setAttribute('lang', ar ? 'en' : 'ar');
      b.firstChild.textContent = ar ? 'EN' : 'ع';
    });
  }

  /* ---------- shared session cart ---------- */
  /* {total, lines:{dardachat|whoamong|love|ramadan: qty}} in sessionStorage; written by home / shop / product / this drawer / checkout */
  var MAX_QTY = 5;
  var CAT = {
    dardachat: { ar: 'صندوق دردشات', en: 'Dardachat Box', price: 149, tone: 'sky', meta: ['+12 · للجمعات العائلية والأصدقاء', '12+ · Family and friends'] },
    whoamong: { ar: 'صندوق مين فينا', en: 'Who Among Us Box', price: 119, tone: 'pink', meta: ['+12 · للعائلة والأصدقاء', '12+ · Family and friends'] },
    love: { ar: 'صندوق دردشات مع الحب', en: 'Dardachat with Love Box', price: 169, tone: 'pink', meta: ['+18 · للأزواج والشركاء', '18+ · For couples and partners'] }
  };
  function readCart() {
    var c = { total: 0, lines: {} };
    try { var v = JSON.parse(sessionStorage.getItem(CART_KEY) || 'null'); if (v && v.lines) c = v; } catch (e) {}
    return c;
  }
  function validLines() {
    var c = readCart(), out = [];
    Object.keys(CAT).forEach(function (id) { var n = Math.floor(+c.lines[id]); if (n > 0) out.push({ id: id, q: Math.min(MAX_QTY, n) }); });
    return out;
  }
  function cartCount() { return validLines().reduce(function (n, l) { return n + l.q; }, 0); }
  function writeLine(id, q) {
    var c = readCart(); c.lines = c.lines || {};
    if (q > 0) c.lines[id] = Math.min(MAX_QTY, q); else delete c.lines[id];
    c.total = Object.keys(c.lines).reduce(function (n, k) { return n + (+c.lines[k] || 0); }, 0);
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function paintBadges() {
    var n = cartCount();
    document.querySelectorAll('.dc-cart').forEach(function (a) {
      var c = a.querySelector('.dc-cart__count');
      if (!c) { c = document.createElement('span'); c.className = 'dc-cart__count dc-num'; a.appendChild(c); }
      c.textContent = String(n); c.hidden = n === 0; c.classList.toggle('is-empty', n === 0);
      a.setAttribute('aria-label', n ? DC.t('السلة، ' + n + (n === 1 ? ' منتج' : ' منتجات'), 'Cart, ' + n + (n === 1 ? ' item' : ' items')) : DC.t('السلة، فارغة', 'Cart, empty'));
    });
  }
  DC.cart = {
    count: cartCount, lines: validLines,
    set: function (id, q) { if (CAT[id]) { writeLine(id, q); changed(); } },
    add: function (id, q) { /* used by the assistant widget: adds q (default 1) and bumps the badges */
      if (!CAT[id]) return false;
      writeLine(id, (+readCart().lines[id] || 0) + (q > 0 ? Math.floor(q) : 1)); changed();
      document.querySelectorAll('.dc-cart__count').forEach(DC.bump); return true;
    },
    open: function (opener) { openDrawer(opener); }, close: function () { closeDrawer(); }
  };
  function changed() { paintBadges(); if (drawerOpen()) renderDrawer(); emit('dc:cart', { count: cartCount() }); }
  window.addEventListener('storage', function (e) { if (e.key === CART_KEY) paintBadges(); });

  /* ---------- shared cart drawer (shell-*) ---------- */
  var scrim, drawer, dBody, dFoot, dCount, dTitle, opener, lastRemoved, undoT, onCheckoutPage = false;
  function drawerOpen() { return !!(drawer && drawer.classList.contains('is-open')); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  var I_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var I_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var I_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  var I_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  var I_ARROW = '<svg class="shell-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function money(v) { return '<span class="dc-num">₪ ' + DC.num(v) + '</span>'; }

  function buildDrawer() {
    if (drawer) return;
    scrim = el('div', 'shell-scrim'); scrim.setAttribute('data-shell', 'close');
    drawer = el('aside', 'shell-drawer');
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-labelledby', 'shellCartTitle'); drawer.setAttribute('inert', '');
    var head = el('div', 'shell-drawer__head');
    dTitle = el('h2', null); dTitle.id = 'shellCartTitle';
    dCount = el('span', 'dc-chip dc-num');
    var x = el('button', 'shell-x', I_X); x.type = 'button'; x.setAttribute('data-shell', 'close');
    head.appendChild(dTitle); head.appendChild(dCount); head.appendChild(x);
    dBody = el('div', 'shell-drawer__body'); dFoot = el('div', 'shell-drawer__foot');
    drawer.appendChild(head); drawer.appendChild(dBody); drawer.appendChild(dFoot);
    var live = el('p', 'shell-sr'); live.id = 'shellCartLive'; live.setAttribute('aria-live', 'polite');
    document.body.appendChild(scrim); document.body.appendChild(drawer); document.body.appendChild(live);
    drawer.addEventListener('click', onDrawerClick);
    scrim.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (!drawerOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(drawer.querySelectorAll('button:not([disabled]), a[href]'), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }
  function say(msg) { var n = document.getElementById('shellCartLive'); if (!n) return; n.textContent = ''; setTimeout(function () { n.textContent = msg; }, 30); }
  function nm(id) { return DC.t(CAT[id].ar, CAT[id].en); }

  function renderDrawer() {
    var L = validLines(), n = cartCount(), keep = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    dTitle.textContent = DC.t('سلتك', 'Your cart');
    dCount.textContent = DC.t(n + ' منتجات', n + ' items');
    drawer.querySelector('.shell-x').setAttribute('aria-label', DC.t('إغلاق السلة', 'Close cart'));
    var undo = lastRemoved ? '<div class="shell-undo" role="status"><span>' + DC.t('أُزيل ' + CAT[lastRemoved.id].ar, CAT[lastRemoved.id].en + ' removed') + '</span><button type="button" class="shell-link" data-shell="undo" data-k="undo">' + DC.t('تراجع', 'Undo') + '</button></div>' : '';
    if (!L.length) {
      dBody.innerHTML = '<p class="shell-empty">' + DC.t('السلة فارغة. اختر صندوقًا من صناديق الألعاب.', 'Your cart is empty. Pick one of the game boxes.') + '</p>';
      dFoot.innerHTML = undo + '<a class="dc-btn" href="shop.html" data-k="shop" style="justify-content:center">' + DC.t('تصفّح الصناديق', 'Browse the boxes') + '</a>';
      syncUrl();
    } else {
      var sub = 0;
      dBody.innerHTML = '<ul class="shell-list">' + L.map(function (l) {
        var c = CAT[l.id]; sub += c.price * l.q;
        var label = nm(l.id);
        return '<li class="shell-line"><span class="shell-thumb" data-tone="' + c.tone + '">' + I_HEART + '</span>' +
          '<div class="shell-line__body"><h3>' + label + '</h3><p>' + DC.t(c.meta[0], c.meta[1]) + '</p>' +
          '<div class="shell-line__foot"><div class="shell-qty" role="group" aria-label="' + DC.t('الكمية: ', 'Quantity: ') + label + '">' +
          '<button type="button" data-shell="dec" data-id="' + l.id + '" data-k="dec:' + l.id + '" aria-label="' + DC.t('إنقاص الكمية: ', 'Decrease quantity: ') + label + '">' + I_MINUS + '</button>' +
          '<output class="dc-num" aria-live="polite">' + l.q + '</output>' +
          '<button type="button" data-shell="inc" data-id="' + l.id + '" data-k="inc:' + l.id + '"' + (l.q >= MAX_QTY ? ' disabled' : '') + ' aria-label="' + DC.t('زيادة الكمية: ', 'Increase quantity: ') + label + '">' + I_PLUS + '</button></div>' +
          '<span class="shell-price">' + money(c.price * l.q) + '</span>' +
          '<button type="button" class="shell-rm" data-shell="rm" data-id="' + l.id + '" data-k="rm:' + l.id + '">' + DC.t('إزالة', 'Remove') + '</button></div></div></li>';
      }).join('') + '</ul>';
      dFoot.innerHTML = undo +
        '<div class="shell-total"><b>' + DC.t('المجموع الفرعي', 'Subtotal') + '</b><span>' + money(sub) + '</span></div>' +
        '<p class="shell-fine">' + DC.t('الأسعار شاملة ضريبة القيمة المضافة. التوصيل يُحسب حسب عنوانك في الخطوات التالية.', 'Prices include VAT. Delivery is worked out from your address in the next steps.') + '</p>' +
        '<button type="button" class="dc-btn dc-btn--cta" data-shell="checkout" data-k="go" style="justify-content:center">' + DC.t('إتمام الطلب', 'Checkout') + I_ARROW + '</button>' +
        '<button type="button" class="dc-btn dc-btn--ghost dc-btn--sm" data-shell="close" style="justify-content:center">' + DC.t('متابعة التسوق', 'Keep shopping') + '</button>';
    }
    if (keep) { var again = drawer.querySelector('[data-k="' + keep + '"]:not([disabled])') || drawer.querySelector('[data-k="go"], [data-k="shop"]'); if (again) again.focus({ preventScroll: true }); }
  }
  function onDrawerClick(e) {
    var b = e.target.closest('[data-shell]'); if (!b) return;
    var act = b.getAttribute('data-shell'), id = b.getAttribute('data-id');
    if (act === 'close') closeDrawer();
    else if (act === 'inc') { var qi = (readCart().lines[id] || 0) + 1; DC.cart.set(id, qi); DC.bump(drawer.querySelector('.dc-chip')); }
    else if (act === 'dec') { DC.cart.set(id, (readCart().lines[id] || 0) - 1); }
    else if (act === 'rm') {
      lastRemoved = { id: id, q: +readCart().lines[id] || 1 }; clearTimeout(undoT);
      undoT = setTimeout(function () { lastRemoved = null; if (drawerOpen()) renderDrawer(); }, 7000);
      say(DC.t('أُزيل ' + CAT[id].ar, CAT[id].en + ' removed'));
      DC.cart.set(id, 0);
      var nx = drawer.querySelector('[data-k^="rm:"]') || drawer.querySelector('[data-k="go"], [data-k="shop"]'); if (nx) nx.focus({ preventScroll: true });
    }
    else if (act === 'undo' && lastRemoved) { var r = lastRemoved; lastRemoved = null; clearTimeout(undoT); DC.cart.set(r.id, r.q); var g = drawer.querySelector('[data-k="go"]'); if (g) g.focus({ preventScroll: true }); }
    else if (act === 'checkout') { closeDrawer(true); DC.go('cart-checkout.html#checkout'); }
  }
  function openDrawer(from) {
    buildDrawer();
    if (drawerOpen()) return;
    opener = from || document.activeElement;
    lastRemoved = null; renderDrawer();
    drawer.removeAttribute('inert');
    Array.prototype.forEach.call(document.body.children, function (c) { if (c !== drawer && c !== scrim && !c.classList.contains('shell-veil') && !c.classList.contains('shell-sr') && c.tagName !== 'SCRIPT') c.setAttribute('data-shell-inert', ''), c.setAttribute('inert', ''); });
    scrim.classList.add('is-open'); drawer.classList.add('is-open');
    root.style.overflow = 'hidden';
    document.querySelectorAll('.dc-cart').forEach(function (c) { c.setAttribute('aria-expanded', 'true'); });
    setTimeout(function () { var f = drawer.querySelector('[data-k="go"], [data-k="shop"]') || drawer.querySelector('.shell-x'); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer(skipFocus) {
    if (!drawerOpen()) return;
    drawer.classList.remove('is-open'); scrim.classList.remove('is-open'); drawer.setAttribute('inert', '');
    document.querySelectorAll('[data-shell-inert]').forEach(function (c) { c.removeAttribute('inert'); c.removeAttribute('data-shell-inert'); });
    root.style.overflow = '';
    document.querySelectorAll('.dc-cart').forEach(function (c) { c.removeAttribute('aria-expanded'); });
    if (skipFocus !== true && opener && document.contains(opener) && opener.focus) setTimeout(function () { opener.focus({ preventScroll: true }); }, 30);
  }
  function drawerOnLang() { paintBadges(); if (drawerOpen()) renderDrawer(); }

  /* ---------- page transitions ---------- */
  var veil, veilT, leaving = false;
  function ensureVeil() {
    if (veil) return veil;
    veil = el('div', 'shell-veil',
      '<span class="shell-veil__card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg></span>');
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
    return veil;
  }
  DC.go = function (url) {
    var u;
    try { u = new URL(url, location.href); if (/\.html?$/.test(u.pathname)) carry(u); } catch (e) { location.href = url; return; }
    if (leaving) return;
    if (DC.reducedMotion() || document.hidden || !document.body) { location.href = u.href; return; }
    leaving = true;
    var v = ensureVeil(); v.classList.remove('is-on'); void v.offsetWidth; v.classList.add('is-on');
    clearTimeout(veilT);
    veilT = setTimeout(function () { location.href = u.href; }, 340);
    setTimeout(function () { if (veil) veil.classList.remove('is-on'); leaving = false; }, 2200); // navigation was cancelled
  };
  window.addEventListener('pageshow', function (e) {
    leaving = false; clearTimeout(veilT);
    if (veil) veil.classList.remove('is-on'); // back/forward cache: the page returns as it was left
    if (e.persisted) { paintBadges(); }
  });

  /* ---------- one click handler for links + the cart button (window level: runs after the page's own handlers) ---------- */
  function onClick(e) {
    if (e.defaultPrevented) return;
    var cart = e.target.closest && e.target.closest('.dc-cart');
    if (cart && !onCheckoutPage) {
      if (cartCount() > 0) { e.preventDefault(); openDrawer(cart); return; }
    }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-noop')) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (!/^(https?|file):$/.test(u.protocol) || u.origin !== location.origin) return;
    if (!/\.html?$|\/$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return; // hash-only or same page
    if (u.pathname === location.pathname && carry(new URL(u.href)).search === carry(new URL(location.href)).search) return;
    e.preventDefault();
    DC.go(u.href);
  }

  /* ---------- assistant widget: loaded on every page except assistant.html ---------- */
  function loadWidget() {
    if (/\/assistant\.html$/.test(location.pathname) || document.querySelector('script[data-shell-widget]')) return;
    function inject() {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assistant-widget.css'; l.setAttribute('data-shell-widget', '');
      l.onerror = function () { l.remove(); };
      document.head.appendChild(l);
      var s = document.createElement('script'); s.src = 'assistant-widget.js'; s.defer = true; s.setAttribute('data-shell-widget', '');
      s.onerror = function () { s.remove(); };
      document.body.appendChild(s);
    }
    if (/^https?:$/.test(location.protocol) && window.fetch) {
      fetch('assistant-widget.js', { method: 'HEAD' }).then(function (r) { if (r.ok) inject(); }).catch(function () {});
    } else inject(); // opened from disk: a missing file simply fails to load
  }

  /* ---------- boot ---------- */
  // Theme before first paint when this script is in <head> (even with defer, applyTheme runs early here).
  applyTheme();
  root.removeAttribute('data-motion');
  root.setAttribute('lang', DC.lang);
  root.setAttribute('dir', DC.lang === 'ar' ? 'rtl' : 'ltr');

  function boot() {
    onCheckoutPage = !!document.getElementById('drawer') && /cart-checkout\.html$/.test(location.pathname);
    applyLang();
    mountHeader();
    paintBadges();
    syncUrl();
    // Opt-in wiring so screens need no boilerplate:
    document.addEventListener('click', function (e) {
      var pop = e.target.closest('[data-pop]'); if (pop) DC.heartPop(pop);
      var card = e.target.closest('button.dc-qcard, .dc-qcard[role="button"]'); if (card && !card.hasAttribute('data-noflip')) DC.flip(card);
      var noop = e.target.closest('a[data-noop]'); if (noop) e.preventDefault();
      var hb = e.target.closest('.dc-hbtn');
      if (hb) { hb.getAttribute('data-dc') === 'lang' ? DC.toggleLang() : DC.toggleTheme(); }
    });
    window.addEventListener('click', onClick);
    document.querySelectorAll('.dc-brush[data-autodraw]').forEach(DC.draw);
    loadWidget();
    emit('dc:ready', { lang: DC.lang, theme: DC.theme, reduced: DC.reducedMotion() });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
