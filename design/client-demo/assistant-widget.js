/* Dardachat assistant widget - assistant-widget.js
   A floating launcher + chat panel (bottom sheet on phones) for every page. Self-contained: one global,
   window.DCAssistant. Works alone or with _shared.js (DC.lang / 'dc:lang' / DC.reducedMotion / DC.heartPop).
   - Language comes from <html lang> (ar | en); changes are picked up from a lang-attribute observer and 'dc:lang'.
   - Theme comes from tokens (ds.css) and [data-theme] on <html>; nothing to do here.
   - Loads assistant-widget.css next to this file if the page has not linked it.
   - Not for assistant.html (it redirects to home.html?asst=open).
   API: DCAssistant.open() / close() / toggle() / isOpen() / ask(text).
   Hooks: any element with [data-dc-assistant] opens it; URL ?asst=open (and ?ask=<text>) opens it on load.
   State (open flag + conversation) is kept per tab in sessionStorage 'dc-aw' so it follows you across pages.
   Optional shell hook: if window.DC.cart.add(id) exists, the box card shows an add-to-cart button. */
(function () {
  'use strict';
  if (window.DCAssistant) return;

  var html = document.documentElement;
  var KEY = 'dc-aw';
  var WA = '972543992424';
  var script = document.currentScript;

  /* ---------- helpers ---------- */
  function lang() { return html.getAttribute('lang') === 'en' ? 'en' : 'ar'; }
  function T(p) { return lang() === 'en' ? p[1] : p[0]; }
  function reduced() {
    try { if (window.DC && typeof DC.reducedMotion === 'function') return DC.reducedMotion(); } catch (e) {}
    return html.getAttribute('data-motion') === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function wa(t) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t); }
  /* keep ?lang / ?theme / ?motion on links to other screens, the way _shared.js does for page links */
  function carry(u) {
    var parts = u.split('#'), base = parts[0].split('?')[0], p = new URLSearchParams(parts[0].split('?')[1] || '');
    if (lang() === 'en') p.set('lang', 'en');
    if (html.getAttribute('data-theme') === 'dark') p.set('theme', 'dark');
    if (html.getAttribute('data-motion') === 'reduce') p.set('motion', 'reduce');
    var s = p.toString();
    return base + (s ? '?' + s : '') + (parts[1] ? '#' + parts[1] : '');
  }
  function ssGet() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function ssSet(o) { try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  /* stylesheet: load it if the page did not */
  (function ensureCss() {
    if (document.querySelector('link[href*="assistant-widget.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = script && script.src ? script.src.replace(/assistant-widget\.js(\?.*)?$/, 'assistant-widget.css') : 'assistant-widget.css';
    document.head.appendChild(l);
  })();

  /* ---------- what the assistant knows: real catalogue and service facts (DESIGN.md 6-7) ---------- */
  var SRC = {
    who: [['صفحة المنتج · صندوق مين فينا', 'Product page · Who Among Us Box'], 'product.html?box=whoamong'],
    shop: [['صفحة صناديق الألعاب', 'Shop'], 'shop.html'],
    love: [['صفحة المنتج · محتويات صندوق دردشات مع الحب', 'Product page · Dardachat with Love Box contents'], 'product.html?box=love#inside'],
    ramadan: [['صفحة المنتج · صندوق رمضان للعائلة', 'Product page · Ramadan Family Box'], 'product.html?box=ramadan'],
    sessions: [['صفحة الجلسات', 'Sessions page'], 'services.html#sessions'],
    nights: [['صفحة ليالي الألعاب', 'Game nights page'], 'services.html#game-nights'],
    workshops: [['صفحة الورشات', 'Workshops page'], 'services.html#workshops']
  };
  var KB = {
    friends: { re: /أصدقاء|اصدقاء|صحاب|قعدة|قعدات|عيلة|عائل|مين فينا|who among|friends|family (night|gathering|game)|for (my )?family|group of|recommend|بتنصح|ننصح/i,
      ar: '«صندوق مين فينا» مناسب لجمعات الأصدقاء والعائلة من عمر +12. يحتوي على 45 بطاقة في 3 مراحل (تعارف، فهم، واكتشاف ممتع)، وبروشور تعليمات، و5 لافتات تصويت. وإذا أردتم أسئلة أعمق مع بطاقات تحدٍّ، فنوصي بـ«صندوق دردشات».',
      en: 'The Who Among Us Box suits get-togethers with friends and family, ages 12+. It has 45 cards in 3 stages (getting to know, understanding, fun discovery), an instructions booklet and 5 voting signs. If you want deeper questions plus challenge cards, look at the Dardachat Box.',
      src: 'who', card: 'who' },
    age: { re: /عمر|(^|\s)سن(\s|$|[؟?])|\bages?\b|how old/i,
      ar: 'العمر المناسب حسب الصندوق: «صندوق دردشات مع الحب» للأزواج من عمر +18. «صندوق دردشات» و«صندوق مين فينا» من عمر +12. و«صندوق رمضان للعائلة» لكل الأعمار.',
      en: 'Ages by box: the Dardachat with Love Box is for couples, 18+. The Dardachat Box and the Who Among Us Box are 12+. The Ramadan Family Box is for all ages.',
      src: 'shop' },
    ramadan: { re: /رمضان|ramadan/i,
      ar: '«صندوق رمضان للعائلة» صندوق موسمي لكل الأعمار، يجمع العائلة بعد الإفطار حول لحظات من الدفء والذكريات والمعلومات الجميلة. يحتوي على 15 بطاقة أسئلة ومعلومات دينية، و15 بطاقة ألغاز دينية، و15 بطاقة أسئلة اجتماعية عن ذكريات رمضان وعاداته. ويعود مع بداية رمضان.',
      en: 'The Ramadan Family Box is seasonal and suits all ages, bringing the family together after iftar. It has 15 religious question and information cards, 15 religious riddle cards and 15 social question cards about Ramadan memories and customs. It comes back when Ramadan starts.',
      src: 'ramadan' },
    nights: { re: /ليالي|ليلة|game night/i,
      ar: 'ليالي الألعاب للأصدقاء والعائلة: تلعب الفرق ألعاب «دردشات»، ولكل تحدٍّ وسؤال جماعي نقاط. السعر 70 ₪ للشخص، أو 1400 ₪ للمجموعة، والمدة من ساعة لساعة ونصف.',
      en: 'Game nights are for friends and family: teams play Dardachat games and win points for challenges and group questions. It costs ₪ 70 per person or ₪ 1400 per group, and lasts 1 to 1.5 hours.',
      src: 'nights', book: { ar: 'ليالي الألعاب', en: 'Game nights', meta: ['[70] للشخص · [1400] للمجموعة · ساعة إلى ساعة ونصف', '[70] per person · [1400] per group · 1 to 1.5 hours'], say: ['مرحبًا دردشات، أرغب في حجز ليلة ألعاب.', 'Hello Dardachat, I would like to book a game night.'] } },
    sessions: { re: /جلس|session/i,
      ar: 'الجلسات حوارية جماعية تعتمد على بطاقات أسئلة «دردشات»، لمجموعات حتى 10 أشخاص. السعر 70 ₪ للشخص، أو 500 ₪ للمجموعة كاملة، ومدة الجلسة ساعة.',
      en: 'Sessions are group dialogue sessions built on Dardachat question cards, for groups of up to 10. It costs ₪ 70 per person or ₪ 500 for the whole group, and lasts 1 hour.',
      src: 'sessions', book: { ar: 'الجلسات', en: 'Sessions', meta: ['[70] للشخص · [500] للمجموعة · ساعة', '[70] per person · [500] per group · 1 hour'], say: ['مرحبًا دردشات، أرغب في حجز جلسة.', 'Hello Dardachat, I would like to book a session.'] } },
    workshops: { re: /ورش|workshop/i,
      ar: 'الورشات لمجموعات من 20 إلى 25 مشاركًا (ورشة الورود مع الحب لـ 8–10 أشخاص فقط): لعب مع نشاط فني ينتهي بذكرى تحتفظون بها. السعر من 100 إلى 180 ₪ للشخص حسب الورشة، والمدة من ساعتين إلى 3 ساعات. ويختلف سعر المجموعة بحسب عدد المشاركين وعدد الورشات، ويوجد مرونة.',
      en: 'Workshops are for groups of 20 to 25 (Roses with Love is for 8–10 people only): play plus an art activity that ends with a keepsake. It costs ₪ 100 to ₪ 180 per person depending on the workshop, and lasts 2 to 3 hours. The group price depends on the number of participants and workshops, and there is flexibility.',
      src: 'workshops', book: { ar: 'الورشات', en: 'Workshops', meta: ['[100] إلى [180] للشخص · ساعتان إلى 3 ساعات', '[100] to [180] per person · 2 to 3 hours'], say: ['مرحبًا دردشات، أرغب في حجز ورشة.', 'Hello Dardachat, I would like to book a workshop.'] } },
    gift: { re: /هدية|هديّة|شريك|زوج|خطيب|حبيب|gift|couple|partner|romantic/i,
      ar: '«صندوق دردشات مع الحب» للأزواج والشركاء من عمر +18، ومصمم لتقوية العلاقة العاطفية وتجديد المشاعر. يحتوي على 63 سؤالًا و16 تحدٍّ ثنائي رومانسي وبطاقة «سرّ الحب الأبدي» و20 قلبًا كريستاليًا، ونرد ولوحة تفاعلية.',
      en: 'The Dardachat with Love Box is for couples, ages 18+, and is designed to strengthen the relationship and renew feelings. It has 63 questions, 16 romantic duo challenges, the Eternal Love Secret card, 20 crystal hearts, a die and an interactive board.',
      src: 'love' },
    inside: { re: /داخل|محتوى|محتويات|شو في|شو بيجي|inside|contain|what.?s in/i,
      ar: 'يضم «صندوق دردشات مع الحب» 3 مجموعات أسئلة (63 سؤالًا) عن معرفة الشريك، والاحتياجات والهدايا، والمشاعر والمواقف. ويحتوي أيضًا على 16 تحدٍّ ثنائي رومانسي، وبطاقة «سرّ الحب الأبدي»، وبطاقتي رسائل سرّية، و20 قلبًا كريستاليًا، ونردًا، ولوحة تفاعلية، وبروشور تعليمات.',
      en: 'The Dardachat with Love Box has 3 sets of questions (63 in all) on knowing your partner, needs and gifts, and feelings and situations. It also has 16 romantic duo challenges, the Eternal Love Secret card, 2 secret-message cards, 20 crystal hearts, a die, an interactive board and an instructions booklet.',
      src: 'love' }
  };
  var ORDER = ['ramadan', 'nights', 'sessions', 'workshops', 'age', 'friends', 'gift', 'inside'];
  /* out-of-scope topics the pages do not answer: never guess, escalate to the team */
  var OOS = /توصيل|شحن|خصم|دفع|استلام|إرجاع|ارجاع|ترجيع|لغة|إنجليزي|delivery|\bship|discount|\bpay|refund|\breturn|language|english/i;
  var FALLBACK = {
    ar: 'ليس لدي جواب مؤكد على هذا السؤال من صفحات الموقع، ولا أفضّل التخمين. يستطيع فريق «دردشات» الإجابة عنه على واتساب.',
    en: 'I don\'t have a confirmed answer to this from the site pages, and I\'d rather not guess. The Dardachat team can answer you on WhatsApp.'
  };
  function match(q) { if (OOS.test(q)) return null; for (var i = 0; i < ORDER.length; i++) if (KB[ORDER[i]].re.test(q)) return ORDER[i]; return null; }

  var CHIPS = [
    ['ما محتويات الصندوق؟', "What's inside the box?"],
    ['ماذا تنصحون لجمعة الأصدقاء؟', 'What do you recommend for friends?'],
    ['كم سعر الجلسة؟', 'How much is a session?'],
    ['كم يستغرق التوصيل؟', 'How long does delivery take?']
  ];

  /* ---------- icons ---------- */
  var HEART = '<svg class="dc-heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  var CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.15-2.9-.45L4.5 20l1.2-3.6C4.4 15.2 4 13.4 4 11.5c0-4 3.6-7 8-7s8 3 8 7z"/></svg>';
  var LAUNCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.15-2.9-.45L4.5 20l1.2-3.6C4.4 15.2 4 13.4 4 11.5c0-4 3.6-7 8-7s8 3 8 7z"/><path d="M12 14.4s-3-1.8-3-3.9a1.7 1.7 0 0 1 3-1.1 1.7 1.7 0 0 1 3 1.1c0 2.1-3 3.9-3 3.9z"/></svg>';

  /* ---------- DOM ---------- */
  var root = h('div', 'dc-aw-root');
  root.innerHTML =
    '<button class="dc-aw-launch" id="dc-aw-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="dc-aw-panel">' + LAUNCH_ICON + '<span class="dc-aw-launch__t" data-k="launch"></span></button>' +
    '<div class="dc-aw-scrim" id="dc-aw-scrim" aria-hidden="true"></div>' +
    '<section class="dc-chat dc-aw-panel" id="dc-aw-panel" role="dialog" aria-labelledby="dc-aw-title" aria-describedby="dc-aw-disc">' +
      '<span class="dc-aw-grab" aria-hidden="true"></span>' +
      '<div class="dc-chat__head dc-aw-head">' +
        '<span class="dc-aw-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg></span>' +
        '<div><span id="dc-aw-title" data-k="title"></span><small id="dc-aw-disc" data-k="disc"></small></div>' +
        '<button class="dc-aw-x" id="dc-aw-close" type="button" data-kl="close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<svg class="dc-brush dc-aw-brush" id="dc-aw-brush" viewBox="0 0 360 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7C34 2 62 11 104 6s78-4 118 1 92 3 134-2"/></svg>' +
      '</div>' +
      '<div class="dc-chat__log dc-aw-log" id="dc-aw-log" tabindex="0" role="group" data-kl="log"></div>' +
      '<form class="dc-aw-form" id="dc-aw-form" autocomplete="off">' +
        '<label class="dc-sr" for="dc-aw-in" data-k="label"></label>' +
        '<input id="dc-aw-in" type="text" dir="auto" maxlength="300" enterkeyhint="send" data-kp="ph">' +
        '<button class="dc-btn dc-aw-send" id="dc-aw-send" type="submit" data-kl="send" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3L10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/></svg></button>' +
      '</form>' +
      '<div class="dc-aw-foot"><a id="dc-aw-wa" href="#" target="_blank" rel="noopener">' + CHAT_ICON + '<span data-k="wa"></span></a><span class="dc-num" dir="ltr">+972 54 399 2424</span></div>' +
      '<div class="dc-sr" id="dc-aw-live" role="status" aria-live="polite"></div>' +
    '</section>';

  var $ = function (s) { return root.querySelector(s); };
  var launch = $('#dc-aw-launch'), panel = $('#dc-aw-panel'), log = $('#dc-aw-log'), form = $('#dc-aw-form'), input = $('#dc-aw-in'),
      send = $('#dc-aw-send'), live = $('#dc-aw-live'), brush = $('#dc-aw-brush'), scrim = $('#dc-aw-scrim'), closeBtn = $('#dc-aw-close');

  var STR = {
    launch: ['اسأل دردشات', 'Ask Dardachat'],
    title: ['مساعد دردشات', 'Dardachat assistant'],
    disc: ['مساعد آلي · الفريق على واتساب في أي وقت', 'Automated · team on WhatsApp, anytime'],
    close: ['إغلاق المساعد', 'Close assistant'],
    log: ['المحادثة', 'Conversation'],
    label: ['اكتب سؤالك', 'Type your question'],
    ph: ['اكتب سؤالك هنا', 'Type your question here'],
    send: ['إرسال', 'Send'],
    wa: ['تواصل مع الفريق على واتساب', 'Contact the team on WhatsApp']
  };
  function paintStatic() {
    var L = lang();
    root.setAttribute('dir', L === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', L);
    [].forEach.call(root.querySelectorAll('[data-k]'), function (e) { e.textContent = T(STR[e.getAttribute('data-k')]); });
    [].forEach.call(root.querySelectorAll('[data-kl]'), function (e) { e.setAttribute('aria-label', T(STR[e.getAttribute('data-kl')])); });
    [].forEach.call(root.querySelectorAll('[data-kp]'), function (e) { e.setAttribute('placeholder', T(STR[e.getAttribute('data-kp')])); });
    launch.setAttribute('aria-label', T(STR.launch));
    launch.setAttribute('title', T(STR.launch));
    $('#dc-aw-wa').href = wa(T(['مرحبًا دردشات، لدي سؤال.', 'Hello Dardachat, I have a question.']));
  }

  /* ---------- state ---------- */
  var saved = ssGet();
  var msgs = [], busy = false, timers = [], flight = null, opened = false, lastFocus = null;
  (saved.msgs || []).forEach(function (m) { if (m && (m.role === 'me' || m.role === 'bot')) msgs.push(m); });
  function persist() { ssSet({ open: root.classList.contains('is-open'), msgs: msgs.slice(-40) }); }
  function later(fn, ms) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); fn(); }, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function scrollEnd() { log.scrollTop = log.scrollHeight; }
  function announce(t) { live.textContent = ''; later(function () { live.textContent = t; }, 60); }

  /* ---------- builders ---------- */
  function boxArt(fill) {
    return '<svg viewBox="0 0 200 180" aria-hidden="true"><g class="dc-aw-peek"><rect x="62" y="40" width="76" height="76" rx="10" fill="var(--surface)"/><circle cx="100" cy="76" r="20" fill="var(--red)"/></g>' +
      '<rect x="30" y="78" width="140" height="92" rx="10" fill="var(--' + fill + ')"/><rect x="30" y="78" width="140" height="92" rx="10" fill="none" stroke="var(--blue)" stroke-width="3"/>' +
      '<circle cx="100" cy="124" r="22" fill="var(--red)"/><path d="M92 124c0-4 3-7 8-7s8 3 8 7-8 10-8 10-8-6-8-10z" fill="var(--on-red)"/>' +
      '<g class="dc-aw-lid"><rect x="24" y="62" width="152" height="24" rx="8" fill="var(--blue)"/></g></svg>';
  }
  function boxCard() {
    var c = h('div', 'dc-aw-card');
    c.innerHTML = '<div class="dc-aw-card__art">' + boxArt('sky') + '</div><div class="dc-aw-card__body"><span class="dc-chip dc-chip--age dc-num"></span>' +
      '<h3 class="dc-aw-card__name"></h3><p class="dc-aw-card__meta"></p><div class="dc-aw-card__acts"></div></div>';
    c.querySelector('.dc-chip').textContent = lang() === 'en' ? '12+' : '+12';
    c.querySelector('h3').textContent = T(['صندوق مين فينا', 'Who Among Us Box']);
    c.querySelector('p').textContent = T(['45 بطاقة في 3 مراحل · 5 لافتات تصويت', '45 cards in 3 stages · 5 voting signs']);
    var a = c.querySelector('.dc-aw-card__acts');
    var view = h('a', 'dc-btn dc-btn--ghost dc-btn--sm', T(['عرض الصندوق', 'View the box'])); view.href = carry('product.html?box=whoamong');
    a.appendChild(view);
    if (window.DC && DC.cart && typeof DC.cart.add === 'function') { /* shell's shared cart, when present */
      var add = h('button', 'dc-btn dc-btn--outline dc-btn--sm'); add.type = 'button'; add.setAttribute('data-pop', '');
      add.innerHTML = '<span></span>' + HEART; add.firstChild.textContent = T(['أضف إلى السلة', 'Add to cart']);
      add.addEventListener('click', function () {
        try { DC.cart.add('whoamong', 1); announce(T(['أُضيف إلى السلة.', 'Added to cart.'])); } catch (e) {}
      });
      a.appendChild(add);
    }
    return c;
  }
  function waCard(kind, opts) {
    var c = h('div', 'dc-aw-card dc-aw-card--plain'), b = h('div', 'dc-aw-card__body'), acts = h('div', 'dc-aw-card__acts');
    var link = h('a', 'dc-btn dc-btn--sm'); link.target = '_blank'; link.rel = 'noopener';
    if (kind === 'book') {
      b.appendChild(h('h3', 'dc-aw-card__name', T([opts.ar, opts.en])));
      var meta = h('p', 'dc-aw-card__meta');
      T(opts.meta).split(/\[(\d+)\]/).forEach(function (part, i) { if (i % 2) meta.appendChild(h('span', 'dc-num', '₪ ' + part)); else if (part) meta.appendChild(document.createTextNode(part)); });
      b.appendChild(meta);
      link.href = wa(T(opts.say)); link.innerHTML = CHAT_ICON + '<span></span>'; link.lastChild.textContent = T(['احجز عبر واتساب', 'Book on WhatsApp']);
      link.className = 'dc-btn dc-btn--cta dc-btn--sm';
    } else {
      b.appendChild(h('h3', 'dc-aw-card__name', T(['تابع مع الفريق', 'Continue with the team'])));
      b.appendChild(h('p', 'dc-aw-card__meta', T(['سنفتح واتساب برسالة جاهزة تتضمن سؤالك، وسيردّ عليك أحد أفراد الفريق.', 'This opens WhatsApp with a ready message that holds your question. Someone from the team will reply.'])));
      link.href = wa(T(['مرحبًا دردشات، لدي سؤال: ', 'Hello Dardachat, I have a question: ']) + opts.q);
      link.innerHTML = CHAT_ICON + '<span></span>'; link.lastChild.textContent = T(['افتح واتساب', 'Open WhatsApp']);
    }
    acts.appendChild(link); b.appendChild(acts); c.appendChild(b);
    return c;
  }
  function srcLink(key) {
    var s = SRC[key], a = h('a', 'dc-msg__src');
    a.href = carry(s[1]); a.setAttribute('data-raw', s[1]);
    a.textContent = T(['المصدر: ', 'Source: ']) + T(s[0]);
    return a;
  }
  function chipsRow() {
    var r = h('div', 'dc-aw-chips');
    CHIPS.forEach(function (c, i) { var b = h('button', 'dc-aw-chip', T(c)); b.type = 'button'; b.setAttribute('data-i', String(i)); r.appendChild(b); });
    return r;
  }
  function typingEl() { var t = h('div', 'dc-typing'); t.setAttribute('role', 'img'); t.setAttribute('aria-label', T(['المساعد يكتب', 'The assistant is typing'])); t.innerHTML = '<i></i><i></i><i></i>'; return t; }
  function botText(m) { var k = m.key && KB[m.key]; return k ? [k.ar, k.en] : [FALLBACK.ar, FALLBACK.en]; }
  function chipText(m) { return m.chip != null ? T(CHIPS[m.chip]) : m.text; }

  function addTurn(m, anim) {
    var turn = h('div', 'dc-aw-turn dc-aw-turn--' + (m.role === 'me' ? 'me' : 'bot')), bubble = null;
    if (m.role === 'hello') {
      var n = h('div', 'dc-aw-notice');
      n.appendChild(h('b', null, T(['أنا مساعد آلي ولست شخصًا', 'I\'m an automated assistant, not a person'])));
      n.appendChild(h('span', null, T(['أجيب من صفحات الموقع فقط، وقد أخطئ. لا تكتب هنا معلومات دفع أو كلمات مرور.', 'I answer from the site pages only, and I can be wrong. Don\'t type payment details or passwords here.'])));
      turn.appendChild(n);
      bubble = h('div', 'dc-msg dc-msg--bot', T(['أهلًا بك في «دردشات». ماذا تحب أن تعرف؟', 'Welcome to Dardachat. What would you like to know?']));
      turn.appendChild(bubble); turn.appendChild(chipsRow());
    } else if (m.role === 'me') {
      bubble = h('div', 'dc-msg dc-msg--me', chipText(m)); bubble.dir = 'auto'; turn.appendChild(bubble);
    } else {
      bubble = h('div', 'dc-msg dc-msg--bot'); bubble.appendChild(h('span', 'dc-aw-txt', anim ? '' : T(botText(m)))); turn.appendChild(bubble);
      if (!anim) extras(turn, bubble, m);
    }
    log.appendChild(turn);
    return { turn: turn, bubble: bubble };
  }
  function extras(turn, bubble, m) {
    var k = m.key && KB[m.key];
    if (k && k.src) bubble.appendChild(srcLink(k.src));
    if (k && k.card === 'who') turn.appendChild(boxCard());
    if (k && k.book) turn.appendChild(waCard('book', k.book));
    if (!k) turn.appendChild(waCard('esc', { q: chipText(m) }));
  }
  function rebuild() {
    log.classList.add('is-static'); log.textContent = '';
    addTurn({ role: 'hello' }, false);
    msgs.forEach(function (m) { addTurn(m, false); });
    scrollEnd(); requestAnimationFrame(function () { log.classList.remove('is-static'); });
  }

  /* ---------- the conversation ---------- */
  function setBusy(b) { busy = b; send.disabled = b || !input.value.trim(); [].forEach.call(log.querySelectorAll('.dc-aw-chip'), function (c) { c.disabled = b; }); }
  function stream(node, text, done) {
    var words = text.match(/\S+\s*/g) || [text], i = 0, out = '';
    (function step() {
      out += words[i++]; node.textContent = out; scrollEnd();
      if (i < words.length) later(step, 42); else done();
    })();
  }
  function ask(q, chip) {
    q = (q || '').trim(); if (!q || busy) return;
    setBusy(true); input.value = '';
    var me = { role: 'me', text: q, chip: chip }; msgs.push(me); addTurn(me, true); scrollEnd();
    var key = match(q), rm = reduced();
    var bot = { role: 'bot', key: key, text: q, chip: chip };
    flight = { bot: bot, typing: typingEl() };
    var t = h('div', 'dc-aw-turn'); t.appendChild(flight.typing); log.appendChild(t); scrollEnd();
    later(function () {
      t.remove(); msgs.push(bot); flight.pushed = true; persist();
      var r = addTurn(bot, true), full = T(botText(bot));
      r.bubble.setAttribute('aria-hidden', 'true');
      var finish = function () {
        r.bubble.removeAttribute('aria-hidden'); announce(full);
        var k = key && KB[key];
        if (k && k.src) { r.bubble.appendChild(srcLink(k.src)); scrollEnd(); }
        later(function () {
          extras(r.turn, { appendChild: function () {} }, bot);
          scrollEnd(); flight = null; setBusy(false);
          if (root.classList.contains('is-open')) input.focus({ preventScroll: true });
        }, rm ? 0 : 280);
      };
      if (rm) { r.bubble.firstChild.textContent = full; finish(); } else stream(r.bubble.firstChild, full, finish);
    }, rm ? 350 : 1000 + Math.round(Math.random() * 400));
    persist();
  }
  /* language switch mid-flight: land on the finished state, then redraw in the new language */
  function settle() {
    if (!flight) return;
    clearTimers();
    if (!flight.pushed) msgs.push(flight.bot);
    flight = null; busy = false;
  }
  var shownLang = lang();
  function onLang() {
    if (lang() === shownLang) return;
    shownLang = lang(); settle(); paintStatic(); rebuild(); setBusy(false); persist();
  }
  document.addEventListener('dc:lang', onLang);
  if (window.MutationObserver) new MutationObserver(onLang).observe(html, { attributes: true, attributeFilter: ['lang'] });

  /* ---------- stacking: keep clear of sticky bottom bars (product bar, journey panel) ---------- */
  var OBSTACLES = ['.dc-pdp-bar', '.dc-jr-panel'], lift = 0;
  function measure() {
    if (document.hidden) return;
    var lr = launch.getBoundingClientRect(), vh = window.innerHeight, h2 = 0;
    OBSTACLES.forEach(function (sel) {
      [].forEach.call(document.querySelectorAll(sel), function (el) {
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
        var r = el.getBoundingClientRect();
        if (r.height < 4 || r.top >= vh - 1 || r.bottom < vh - 24) return;
        var base = lr.width ? lr : { left: vh, right: 0 };
        if (r.left >= base.right || r.right <= base.left) return;
        h2 = Math.max(h2, Math.ceil(vh - r.top));
      });
    });
    if (h2 !== lift) { lift = h2; root.style.setProperty('--dc-aw-lift', lift + 'px'); }
  }
  var mTimer = null;
  function watchObstacles() {
    if (mTimer) return;
    mTimer = setInterval(measure, 400);
    window.addEventListener('resize', measure);
    document.addEventListener('transitionend', measure, true);
    measure();
  }

  /* ---------- open / close ---------- */
  var mobile = window.matchMedia ? matchMedia('(max-width: 559px)') : { matches: false };
  var inerted = [];
  function setInert(on) {
    if (on) {
      [].forEach.call(document.body.children, function (el) {
        if (el === root || el.inert || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)) return;
        el.inert = true; inerted.push(el);
      });
    } else { inerted.forEach(function (el) { el.inert = false; }); inerted = []; }
  }
  function isOpen() { return root.classList.contains('is-open'); }
  function setOpen(on, focusInput) {
    if (on === isOpen()) return;
    root.classList.toggle('is-open', on);
    launch.setAttribute('aria-expanded', String(on));
    panel.setAttribute('aria-modal', on && mobile.matches ? 'true' : 'false');
    if (on) {
      if (mobile.matches) setInert(true);
      lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : launch;
      if (!opened) { opened = true; if (window.DC && DC.draw) DC.draw(brush); }
      measure(); scrollEnd();
      later(function () { if (focusInput !== false) input.focus({ preventScroll: true }); }, 60);
    } else {
      setInert(false);
      var back = lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null ? lastFocus : launch;
      back.focus({ preventScroll: true });
    }
    persist();
  }
  launch.addEventListener('click', function () { setOpen(true); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  scrim.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); setOpen(false); } });
  /* on phones the sheet is modal: keep Tab inside it */
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !mobile.matches) return;
    var f = [].slice.call(panel.querySelectorAll('a[href],button:not([disabled]),input,[tabindex="0"]')).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  if (mobile.addEventListener) mobile.addEventListener('change', function () {
    setInert(false); if (isOpen() && mobile.matches) setInert(true);
    panel.setAttribute('aria-modal', isOpen() && mobile.matches ? 'true' : 'false');
  });
  /* anything on the page can open it: <button data-dc-assistant> */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-dc-assistant]');
    if (t && !root.contains(t)) { e.preventDefault(); setOpen(true); }
  });

  /* sources: links to another page just navigate (language/theme carried). A link to the page you are on
     (same file, same query, with a #target) closes the sheet on phones and scrolls to the target. */
  log.addEventListener('click', function (e) {
    var a = e.target.closest('a.dc-msg__src'); if (!a) return;
    var raw = a.getAttribute('data-raw') || '', parts = raw.split('#'), tgt = parts[1] && document.getElementById(parts[1]);
    var u = parts[0].split('?'), here = location.pathname.split('/').pop() || 'index.html';
    var same = u[0] === here && (!u[1] || u[1] === location.search.slice(1).replace(/&?(lang|theme|motion)=[^&]*/g, '').replace(/^&/, ''));
    if (!tgt || !same) return;
    e.preventDefault();
    var sheet = mobile.matches; if (sheet) setOpen(false);
    requestAnimationFrame(function () {
      tgt.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      if (sheet) { tgt.setAttribute('tabindex', '-1'); tgt.focus({ preventScroll: true }); }
    });
  });

  /* ---------- input ---------- */
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', function () { send.disabled = busy || !input.value.trim(); });
  log.addEventListener('click', function (e) { var c = e.target.closest('.dc-aw-chip'); if (c && !busy) { var i = +c.getAttribute('data-i'); ask(T(CHIPS[i]), i); } });
  /* ---------- API + boot ---------- */
  window.DCAssistant = {
    open: function () { setOpen(true); }, close: function () { setOpen(false); },
    toggle: function () { setOpen(!isOpen()); }, isOpen: isOpen,
    ask: function (q) { setOpen(true, false); ask(q); }
  };

  function mount() {
    if (document.getElementById('dc-aw-launch')) return;
    document.body.appendChild(root);
    paintStatic(); rebuild(); setBusy(false); watchObstacles();
    var qs = new URLSearchParams(location.search), asst = qs.get('asst'), q = qs.get('ask');
    if (asst === 'open' || asst === '1' || qs.get('open') || q) { setOpen(true, false); }
    else if (saved.open && !mobile.matches) { setOpen(true, false); }
    if (q) later(function () { ask(q); }, 500);
    /* tidy the helper params so a reload or a shared link does not reopen it */
    if (asst || q || qs.get('open')) try {
      var u = new URL(location.href); ['asst', 'ask', 'open'].forEach(function (k) { u.searchParams.delete(k); }); history.replaceState(history.state, '', u);
    } catch (e) {}
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
