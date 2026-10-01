/* Dardachat prototypes — _shared.js
   Tiny helpers every screen may use. No dependencies. Load with:
     <script src="_shared.js" defer></script>
   API (window.DC):
     DC.lang            'ar' | 'en'         DC.setLang('en') / DC.toggleLang()
     DC.theme           'light' | 'dark'    DC.setTheme('dark') / DC.toggleTheme()
     DC.reducedMotion() true when the OS asks for reduced motion OR the toolbar's Motion toggle is off
     DC.t(ar, en)       pick a string for the current language (for text built in JS)
     DC.restart(el, cls) remove + reflow + re-add a class (re-runs a CSS animation)
     DC.heartPop(btn)   .dc-btn[data-pop] heart pop        DC.bump(el)  cart-count bump
     DC.flip(card)      toggle .dc-qcard (keeps aria-pressed in sync)
     DC.draw(svg)       brush draw-on: measures each path, sets --len, adds .is-drawing
     DC.num(n, d)       Latin digits, fixed decimals ('149.00')
   Events on document: 'dc:lang' {lang}, 'dc:theme' {theme}, 'dc:motion' {reduced}.
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
   State is kept in the URL (?lang=en&theme=dark&motion=reduce) so links between screens keep it,
   and in localStorage as a per-viewer convenience (wrapped in try/catch).
   <html data-no-protobar> hides the floating prototype toolbar. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'dc-proto';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: function () {} };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ lang: DC.lang, theme: DC.theme, motion: root.getAttribute('data-motion') || '' })); } catch (e) {} }
  var q = new URLSearchParams(location.search);
  var stored = load();

  var DC = window.DC = {
    lang: (q.get('lang') || stored.lang || root.getAttribute('lang') || 'ar') === 'en' ? 'en' : 'ar',
    theme: (q.get('theme') || stored.theme || root.getAttribute('data-theme') || 'light') === 'dark' ? 'dark' : 'light'
  };

  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }

  function syncUrl() {
    try {
      var u = new URL(location.href);
      DC.lang === 'en' ? u.searchParams.set('lang', 'en') : u.searchParams.delete('lang');
      DC.theme === 'dark' ? u.searchParams.set('theme', 'dark') : u.searchParams.delete('theme');
      root.getAttribute('data-motion') === 'reduce' ? u.searchParams.set('motion', 'reduce') : u.searchParams.delete('motion');
      history.replaceState(history.state, '', u);
    } catch (e) {}
    // carry state across relative links to other screens
    document.querySelectorAll('a[href$=".html"], a[href*=".html?"], a[href*=".html#"]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (/^[a-z]+:/i.test(raw)) return;
      var h = raw.split('#'), base = h[0].split('?')[0], p = new URLSearchParams(h[0].split('?')[1] || '');
      ['lang', 'theme', 'motion'].forEach(function (k) { var v = u2(k); v ? p.set(k, v) : p.delete(k); });
      var s = p.toString();
      a.setAttribute('href', base + (s ? '?' + s : '') + (h[1] ? '#' + h[1] : ''));
    });
  }
  function u2(k) {
    if (k === 'lang') return DC.lang === 'en' ? 'en' : '';
    if (k === 'theme') return DC.theme === 'dark' ? 'dark' : '';
    return root.getAttribute('data-motion') === 'reduce' ? 'reduce' : '';
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
  DC.setLang = function (L) { DC.lang = L === 'en' ? 'en' : 'ar'; applyLang(); save(); syncUrl(); paintBar(); emit('dc:lang', { lang: DC.lang }); };
  DC.toggleLang = function () { DC.setLang(DC.lang === 'ar' ? 'en' : 'ar'); };
  DC.t = function (ar, en) { return DC.lang === 'en' ? en : ar; };
  DC.applyLang = applyLang; // call on content you inject later: DC.applyLang(container)

  /* ---------- theme ---------- */
  function applyTheme() { DC.theme === 'dark' ? root.setAttribute('data-theme', 'dark') : root.removeAttribute('data-theme'); }
  DC.setTheme = function (t) { DC.theme = t === 'dark' ? 'dark' : 'light'; applyTheme(); save(); syncUrl(); paintBar(); emit('dc:theme', { theme: DC.theme }); };
  DC.toggleTheme = function () { DC.setTheme(DC.theme === 'dark' ? 'light' : 'dark'); };

  /* ---------- reduced motion ---------- */
  DC.reducedMotion = function () { return mq.matches || root.getAttribute('data-motion') === 'reduce'; };
  DC.setMotion = function (reduce) {
    reduce ? root.setAttribute('data-motion', 'reduce') : root.removeAttribute('data-motion');
    save(); syncUrl(); paintBar(); emit('dc:motion', { reduced: DC.reducedMotion() });
  };
  if (mq.addEventListener) mq.addEventListener('change', function () { paintBar(); emit('dc:motion', { reduced: DC.reducedMotion() }); });

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

  /* ---------- prototype toolbar ---------- */
  var bar;
  function paintBar() {
    if (!bar) return;
    var b = bar.querySelectorAll('button');
    b[0].textContent = DC.lang === 'ar' ? 'English' : 'العربية';
    b[0].setAttribute('lang', DC.lang === 'ar' ? 'en' : 'ar');
    b[1].textContent = DC.theme === 'dark' ? (DC.lang === 'ar' ? 'كريمي' : 'Cream') : (DC.lang === 'ar' ? 'ليلي' : 'Night');
    b[2].textContent = DC.lang === 'ar' ? 'حركة أقل' : 'Less motion';
    b[2].setAttribute('aria-pressed', String(DC.reducedMotion()));
    b[2].disabled = mq.matches; // the OS setting always wins
    bar.setAttribute('aria-label', DC.lang === 'ar' ? 'أدوات النموذج' : 'Prototype controls');
  }
  function mountBar() {
    if (root.hasAttribute('data-no-protobar')) return;
    bar = document.createElement('div');
    bar.className = 'dc-proto-bar';
    bar.setAttribute('role', 'group');
    bar.innerHTML = '<button type="button" data-dc="lang"></button><button type="button" data-dc="theme"></button><button type="button" data-dc="motion"></button>';
    bar.addEventListener('click', function (e) {
      var k = e.target.closest('button') && e.target.closest('button').getAttribute('data-dc');
      if (k === 'lang') DC.toggleLang();
      if (k === 'theme') DC.toggleTheme();
      if (k === 'motion') DC.setMotion(root.getAttribute('data-motion') !== 'reduce');
    });
    document.body.appendChild(bar);
    paintBar();
  }

  /* ---------- boot ---------- */
  // Theme + motion before first paint when this script is in <head> (even with defer, applyTheme runs early here).
  applyTheme();
  var qm = q.get('motion') || stored.motion;
  if (qm === 'reduce') root.setAttribute('data-motion', 'reduce');
  root.setAttribute('lang', DC.lang);
  root.setAttribute('dir', DC.lang === 'ar' ? 'rtl' : 'ltr');

  function boot() {
    applyLang();
    mountBar();
    syncUrl();
    // Opt-in wiring so screens need no boilerplate:
    document.addEventListener('click', function (e) {
      var pop = e.target.closest('[data-pop]'); if (pop) DC.heartPop(pop);
      var card = e.target.closest('button.dc-qcard, .dc-qcard[role="button"]'); if (card && !card.hasAttribute('data-noflip')) DC.flip(card);
      var noop = e.target.closest('a[data-noop]'); if (noop) e.preventDefault();
    });
    document.querySelectorAll('.dc-brush[data-autodraw]').forEach(DC.draw);
    emit('dc:ready', { lang: DC.lang, theme: DC.theme, reduced: DC.reducedMotion() });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
