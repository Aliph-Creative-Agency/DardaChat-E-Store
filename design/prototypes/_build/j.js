
document.addEventListener('dc:ready', function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var t = function (a, e) { return DC.t(a, e); };
  var Q = new URLSearchParams(location.search);

  /* ================= placeholder content (one data block; replace when the client concept arrives) ================= */
  var TRAITS = [
    { ar: 'الدفء', en: 'Warmth' }, { ar: 'الفضول', en: 'Curiosity' }, { ar: 'المبادرة', en: 'Initiative' }, { ar: 'الإصغاء', en: 'Listening' }
  ]; // index order = weights order [warmth, curiosity, initiative, listening]
  var SCENES = [
    { name: ['الوصول', 'Arriving'],
      q: ['وصلت عالجمعة. الكل واقف وبحكي بصوت واطي، والطاولة لسا فاضية. شو بتعمل؟', 'You arrive at the gathering. Everyone is standing, talking quietly, and the table is still bare. What do you do?'],
      c: [['بسحب كرسي وبقعد أول واحد', 'I pull out a chair and sit down first'], ['بسلّم عالكل وبسأل كل واحد عن أخباره', 'I greet everyone and ask each person how they are'], ['بوقف جنب الشباك وبراقب الجو شوي', 'I stand by the window and take in the mood']],
      w: [[0, 1, 2, 0], [2, 0, 1, 0], [0, 1, 0, 2]] },
    { name: ['الطاولة', 'The table'],
      q: ['قعدوا كلهم. بنص الطاولة كومة بطاقات مقلوبة. شو بتعمل؟', 'Everyone has sat down. In the middle of the table is a pile of face-down cards. What do you do?'],
      c: [['بسحب أول بطاقة وبقرأها بصوت عالي', 'I draw the top card and read it out loud'], ['بسأل الكل: مين بدو يبلّش؟', 'I ask everyone: who wants to start?'], ['بستنى حدا غيري يبلّش وبراقب', 'I wait for someone else to begin, and watch']],
      w: [[0, 1, 2, 0], [2, 0, 1, 0], [0, 1, 0, 2]] },
    { name: ['أول بطاقة', 'The first card'],
      q: ['انقلبت البطاقة وفيها سؤال: «شو أول ذكرى دافية بتخطر ببالك؟» الكل ساكت. شو بتعمل؟', 'The card is turned and it asks: “What is the first warm memory that comes to mind?” The table goes quiet. What do you do?'],
      c: [['بحكي ذكرى من طفولتي حتى أكسر الصمت', 'I share a childhood memory to break the silence'], ['بسأل اللي جنبي: وإنت، شو ذكراك؟', 'I ask the person beside me: and yours?'], ['بسمع بانتباه وبستنى دوري', 'I listen closely and wait for my turn']],
      w: [[2, 0, 1, 0], [0, 2, 0, 1], [1, 0, 0, 2]] },
    { name: ['التحدي', 'The challenge'],
      q: ['حدا سحب بطاقة تحدي: كل واحد بيوصف اللي جنبه بثلاث كلمات. شو بتعمل؟', 'Someone drew a challenge card: everyone describes the person beside them in three words. What do you do?'],
      c: [['بضحك وبحكي أول', 'I laugh and go first'], ['بسأله: أي كلمات بتحب تسمعها عن حالك؟', 'I ask them: which words would you love to hear about yourself?'], ['بختار كلمات هادية ودافية', 'I choose calm, warm words']],
      w: [[1, 0, 2, 0], [1, 2, 0, 0], [2, 0, 0, 1]] },
    { name: ['الكشف', 'The reveal'],
      q: ['بقيت بطاقة وحدة مقلوبة قبل ما تخلص القعدة. شو بتحب تسأل؟', 'One card is left face down before the evening ends. What do you want to ask?'],
      c: [['سؤال عميق بخلينا نفكر شوي', 'A deep question that makes us think'], ['شي بيضحكنا كلنا', 'Something that makes us all laugh'], ['بشكر الكل وبسأل مين بدو نعيدها', 'I thank everyone and ask when we can do this again']],
      w: [[0, 3, 0, 0], [0, 0, 2, 1], [2, 0, 0, 1]] }
  ];
  var TYPES = {
    warm: { name: ['قلب الطاولة', 'The Heart of the Table'], line: ['وجودك بيخلّي الكل يرتاح ويحكي.', 'Your presence helps everyone relax and talk.'],
      body: ['بتلاحظ مين ساكت ومين محتاج كلمة حلوة. الناس بتحكي معك لأنها حاسة إنك مهتم. جرّب مرات تحكي عن حالك أكتر، القعدة بتستفيد.', 'You notice who is quiet and who needs a kind word. People talk to you because they feel you care. Try sharing more about yourself now and then; the table gains from it.'],
      box: 'ramadan', alt: 'dardachat', boxText: ['صندوق رمضان للعائلة بيناسب قعدة دافية، وهو موسمي.', 'The Ramadan Family Box suits a warm gathering. It is seasonal.'], q: 2, prof: [.85, .3, .35, .45] },
    curious: { name: ['صاحب السؤال', 'The Question-Keeper'], line: ['عندك سؤال لكل قصة.', 'You have a question for every story.'],
      body: ['بتحب تفهم شو ورا الكلام. أسئلتك بتفتح أبواب ما توقعها حدا. وتذكّر إن السؤال الحلو أحيانًا بدو صمت قبل الجواب.', 'You like to understand what sits behind the words. Your questions open doors nobody expected. Remember that a good question sometimes needs a pause before the answer.'],
      box: 'dardachat', boxText: ['صندوق دردشات فيه أسئلة عميقة وتحديات، وبيناسب هيك قعدة.', 'The Dardachat Box, full of deep questions and challenges, suits a table like this.'], q: 0, prof: [.4, .9, .35, .3] },
    spark: { name: ['شرارة البداية', 'The Spark'], line: ['بتبلّش، والباقي بيلحقك.', 'You begin, and the rest follow.'],
      body: ['لما الطاولة بتسكت، إنت اللي بتحرّك الجو. حماسك بيعدي غيرك. مرات خلّي مساحة كمان حتى يلاقي حدا غيرك مكانه.', 'When the table goes quiet, you get things moving. Your energy spreads. Sometimes leave a little room, so someone else can find their place.'],
      box: 'whoamong', boxText: ['صندوق مين فينا بيبلّش الضحك بسرعة.', 'The Who Among Us Box gets the laughter going quickly.'], q: 0, prof: [.35, .4, .9, .25] },
    listener: { name: ['أذن القلب', 'The Open Ear'], line: ['بتسمع أكتر ما بتحكي، وهاد بيكفي.', 'You listen more than you talk, and that is enough.'],
      body: ['بتلاحظ التفاصيل الصغيرة اللي بتفوت غيرك. الناس بترتاح معك لأنها حاسة إنك مصغي. لما حدا يسألك، جاوب بقصة من عندك، بيحبوا يسمعوك.', 'You catch the small details others miss. People feel at ease with you because you truly listen. When someone asks you a question, answer with a story of your own; they would love to hear it.'],
      box: 'dardachat', boxText: ['صندوق دردشات فيه أسئلة بتفتح الحكي بهدوء.', 'The Dardachat Box has questions that open a conversation gently.'], q: 1, prof: [.45, .3, .25, .9] },
    bridge: { name: ['جسر الحكي', 'The Bridge'], line: ['بتوصل بين اللي بيحكي واللي بيسمع.', 'You connect the one who talks with the one who listens.'],
      body: ['بتجمع الدفء والإصغاء، فبتقرّب الناس من بعض بدون ما تحس. القعدة اللي إنت فيها بيلاقي فيها كل واحد مكانه.', 'You bring warmth and listening together, so people grow closer without noticing. In a gathering with you, everyone finds their place.'],
      box: 'whoamong', boxText: ['صندوق مين فينا بيقرّب الناس من بعض.', 'The Who Among Us Box brings people closer.'], q: 1, prof: [.8, .3, .3, .8] },
    balanced: { name: ['الضيف المتوازن', 'The Even Hand'], line: ['شوي من كل شي، وبالوقت المناسب.', 'A little of everything, at the right time.'],
      body: ['مرات بتبلّش، ومرات بتسمع، ومرات بتسأل. بتعرف شو بتحتاج القعدة وبتتغيّر معها.', 'Sometimes you begin, sometimes you listen, sometimes you ask. You sense what the evening needs and move with it.'],
      box: 'dardachat', boxText: ['أي صندوق بيمشي، وأحسن بداية صندوق دردشات.', 'Any box works; the Dardachat Box is the best place to begin.'], q: 1, prof: [.6, .6, .6, .6] }
  };
  var BOXES = { // deep links go to product.html?box=<id>; Ramadan is seasonal, so a year-round alternative can ride along
    dardachat: { n: ['صندوق دردشات', 'Dardachat Box'], cta: ['شوف صندوق دردشات', 'See the Dardachat Box'], alt: ['وبرّا رمضان: صندوق دردشات', 'Outside Ramadan: the Dardachat Box'] },
    whoamong: { n: ['صندوق مين فينا', 'Who Among Us Box'], cta: ['شوف صندوق مين فينا', 'See the Who Among Us Box'] },
    ramadan: { n: ['صندوق رمضان للعائلة', 'Ramadan Family Box'], cta: ['شوف صندوق رمضان للعائلة', 'See the Ramadan Family Box'] }
  };
  var QUOTES = [ // brand lines, verbatim from DESIGN.md §4
    ['«مفتاح المعرفة هو السؤال»', '“The key to knowing is the question.”'],
    ['«قبل ما نتعمق بمعرفة الأشخاص من حولنا مهم نتعمق في معرفة ذاتنا»', '“Before we get to know the people around us, it matters to get to know ourselves.”'],
    ['«دردشات تأخذنا خطوة إلى الوراء في الزمن لنرجع ذكرياتنا الدافئة من جديد»', '“Dardachat takes us a step back in time, to bring our warm memories back.”']
  ];
  var MAXES = TRAITS.map(function (_, k) { return SCENES.reduce(function (s, sc) { return s + Math.max.apply(null, sc.w.map(function (w) { return w[k]; })); }, 0); });

  /* ================= state ================= */
  var S = { gen: 0, shared: Q.get('shared') === '1', phase: 'intro', i: 0, picks: [], busy: false, mode: 'probing', typeKey: null, saved: false, forceFlat: Q.get('webgl') === 'off', soundOn: false, lastFocus: null };
  var els = {
    head: $('#jr-head'), intro: $('#jr-intro'), introCard: $('#jr-intro-card'), play: $('#jr-play'), result: $('#jr-result'), panel: $('#jr-journey'), top: $('#jr-top'),
    canvas: $('#jr-canvas'), flat: $('#jr-flat')
  };
  function reduced() { return DC.reducedMotion(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hideToast() { var el = $('#jr-toast'); clearTimeout(toast._t); el.classList.remove('is-on', 'has-link', 'has-act'); }
  function actionToast(msg, label, fn) {
    var el = $('#jr-toast'); el.textContent = msg; el.classList.remove('has-link'); el.classList.add('has-act');
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.addEventListener('click', function () { hideToast(); fn(); }); el.appendChild(b);
    void el.offsetWidth; el.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(hideToast, 5000);
  }
  function toast(msg, url) {
    var el = $('#jr-toast'); el.textContent = msg; el.classList.toggle('has-link', !!url);
    if (url) { var b = document.createElement('bdi'); b.setAttribute('dir', 'ltr'); b.textContent = url; el.appendChild(b); }
    el.classList.remove('has-act'); el.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('is-on'); el.classList.remove('has-link'); }, url ? 9000 : 2600);
  }

  /* ================= sound (off until the viewer turns it on) ================= */
  var ac = null;
  function beep(kind) {
    if (!S.soundOn) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ac = ac || new C(); if (ac.state === 'suspended') ac.resume();
      var notes = kind === 'result' ? [523.25, 659.25, 783.99] : kind === 'flip' ? [392] : [493.88];
      notes.forEach(function (f, n) {
        var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + n * 0.11;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.3);
      });
    } catch (e) {}
  }
  function paintSound() {
    document.querySelectorAll('.js-sound').forEach(function (b) {
      b.setAttribute('aria-pressed', String(S.soundOn));
      b.setAttribute('aria-label', t('الصوت', 'Sound')); // stable name; the on/off state is announced once, by aria-pressed
      var s = b.querySelector('.dc-jr-sound__t'); if (s) s.textContent = t(S.soundOn ? 'الصوت شغّال' : 'الصوت مغلق', S.soundOn ? 'Sound on' : 'Sound off');
    });
  }
  document.querySelectorAll('.js-sound').forEach(function (b) { b.addEventListener('click', function () { S.soundOn = !S.soundOn; paintSound(); if (S.soundOn) beep('pick'); }); });

  /* ================= 3D scene (three.js r128, procedural, on demand) ================= */
  /* brand brush-blob rug: strokes in a 0..100 unit square, shared by the 3D texture and the flat SVG (the flat one squashes it like the ground plane) */
  var RUG = {
    m: [['M24 24C38 18 58 30 78 22', 22], ['M13 40C32 34 60 46 87 38', 22], ['M11 56C34 50 62 62 89 54', 22], ['M15 72C36 66 60 78 85 70', 22], ['M26 86C42 82 60 90 76 84', 18]],
    a: [['M9 90C30 99 58 99 82 91', 3.4]]
  };
  var GLYPH = 'data:image/png;base64,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'; // the finger-heart from the logo lockup (assets/dardachat-fingerheart.png), embedded so WebGL can read it from file:// too
  var G = null; // {renderer, scene, camera, ...} set by init3D
  var KF = [ // per-scene camera: look-at point, direction from that point, and the radius that must stay in frame
    { look: [0, 1.0, 0], dir: [0, .85, 1], rb: 3.7 },
    { look: [0, 1.0, .1], dir: [0, .8, 1], rb: 3.5 },
    { look: [0, 1.5, .3], dir: [0, .7, 1], rb: 3.0 },
    { look: [0, 1.0, .1], dir: [-.4, .8, 1], rb: 3.4 },
    { look: [0, 1.4, 0], dir: [.35, .78, 1], rb: 3.6 }
  ];
  var FRIEND_ORDER = [3, 2, 4, 1, 5]; // seat indices for the friends; seat 0 is "you" at the front
  var FRIENDS_AT = [3, 4, 5, 5, 5];
  function easeInOut(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeBack(k) { var c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  var tweens = [], raf = 0;
  function tw(dur, fn, ease) {
    return new Promise(function (res) {
      if (reduced() || dur <= 0) { fn(1); render(); return res(); }
      tweens.push({ t0: performance.now(), dur: dur, fn: fn, ease: ease || easeInOut, res: res }); kick();
    });
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    tweens = tweens.filter(function (w) { var k = Math.max(0, Math.min(1, (now - w.t0) / w.dur)); w.fn(w.ease(k)); if (k >= 1) { w.res(); return false; } return true; });
    render(); if (tweens.length) raf = requestAnimationFrame(tick);
  }
  function render() { if (G) G.renderer.render(G.scene, G.camera); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function palette() {
    var dark = DC.theme === 'dark';
    // In Night the table stays lit in the brand colours while the ground (page background) turns navy.
    return { pink: dark ? '#ecc8ca' : css('--pink'), sky: dark ? '#bbd3eb' : css('--sky'), white: dark ? '#f8f6f1' : css('--surface'), face: dark ? '#f8f6f1' : css('--surface'), blue: '#1a4999', red: css('--red'), ink: '#13284f', rug: dark ? css('--surface') : css('--sky'), shadow: '#13284f' };
  }

  function init3D() {
    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfc4, 0.74));
    var sun = new THREE.DirectionalLight(0xffffff, 0.3); sun.position.set(3, 8, 5); scene.add(sun);
    var M = {}; ['pink', 'sky', 'white', 'blue', 'red', 'ink'].forEach(function (k) { M[k] = new THREE.MeshLambertMaterial({ color: 0xffffff }); });
    // rug: a CanvasTexture painted from the brand brush strokes (unlit, so the token colours land exactly)
    var rugCv = document.createElement('canvas'); rugCv.width = rugCv.height = 1024;
    var rugTex = new THREE.CanvasTexture(rugCv); rugTex.anisotropy = 4;
    M.rug = new THREE.MeshBasicMaterial({ map: rugTex, transparent: true, depthWrite: false });
    M.face = new THREE.MeshLambertMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.hairOff = new THREE.MeshLambertMaterial({ color: 0x13284f, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    M.hairBlue = new THREE.MeshLambertMaterial({ color: 0x1a4999, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    var glyphTex = new THREE.CanvasTexture(document.createElement('canvas')), glyphAsp = 0.63;
    M.glyph = new THREE.MeshBasicMaterial({ map: glyphTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    (function () { var im = new Image(); im.onload = function () { var cv = glyphTex.image; cv.width = 256; cv.height = Math.round(256 * im.height / im.width); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); glyphAsp = im.width / im.height; glyphTex.needsUpdate = true; render(); }; im.src = GLYPH; })();
    function paintRug(p) {
      var c = rugCv.getContext('2d'), dark = DC.theme === 'dark';
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1024, 1024); c.scale(10.24, 10.24); c.lineCap = 'round'; c.lineJoin = 'round';
      RUG.m.forEach(function (r) { c.strokeStyle = p.rug; c.lineWidth = r[1]; c.stroke(new Path2D(r[0])); });
      c.setLineDash([9, 2.5, 16, 3.5, 6, 2]); c.lineWidth = 1.1; c.strokeStyle = dark ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.6)';
      RUG.m.forEach(function (r) { c.save(); c.translate(0, -4); c.stroke(new Path2D(r[0])); c.restore(); });
      c.setLineDash([]); c.globalAlpha = dark ? 0.55 : 1; c.strokeStyle = css('--brush');
      RUG.a.forEach(function (r) { c.lineWidth = r[1]; c.stroke(new Path2D(r[0])); });
      c.globalAlpha = 1; rugTex.needsUpdate = true;
    }
    M.shadow = new THREE.MeshBasicMaterial({ color: 0x13284f, transparent: true, opacity: 0.13, depthWrite: false });
    M.heart = new THREE.MeshBasicMaterial({ color: 0xe32328, transparent: true, side: THREE.DoubleSide });
    function paintMats() { var p = palette(); ['pink', 'sky', 'white', 'face', 'blue', 'red', 'ink'].forEach(function (k) { M[k].color.set(p[k]); }); M.heart.color.set(p.red); paintRug(p); }
    paintMats();

    function add(parent, geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }
    function blob(parent, r, x, z) { var m = add(parent, new THREE.CircleGeometry(r, 24), M.shadow, x, 0.012, z); m.rotation.x = -Math.PI / 2; return m; }
    var world = new THREE.Group(); scene.add(world);

    // rug + table
    var rug = add(world, new THREE.PlaneGeometry(8.2, 8.2), M.rug, 0, 0.004, 0); rug.rotation.x = -Math.PI / 2;
    blob(world, 2.2, 0, 0);
    add(world, new THREE.CylinderGeometry(0.8, 0.9, 0.08, 32), M.blue, 0, 0.04, 0);
    add(world, new THREE.CylinderGeometry(0.22, 0.3, 1.05, 16), M.blue, 0, 0.55, 0);
    add(world, new THREE.CylinderGeometry(1.9, 1.9, 0.07, 56), M.blue, 0, 1.07, 0);
    add(world, new THREE.CylinderGeometry(1.85, 1.85, 0.12, 56), M.pink, 0, 1.13, 0);
    var TOP = 1.19;

    // people: seat 0 is you (front, red); the friends alternate blue and pink
    var R = 2.75, seats = [];
    function person(i) {
      var g = new THREE.Group(), th = Math.PI / 2 + i * Math.PI / 3, you = i === 0;
      g.position.set(Math.cos(th) * R, 0, Math.sin(th) * R); g.rotation.y = -Math.atan2(g.position.z, g.position.x) - Math.PI / 2; // local +z (eyes) points at the table centre
      blob(g, 0.62, 0, 0);
      add(g, new THREE.CylinderGeometry(0.36, 0.32, 0.5, 20), you ? M.red : M.white, 0, 0.25, 0);
      var body = add(g, new THREE.CylinderGeometry(0.24, 0.36, 0.8, 16), you ? M.red : (i % 2 ? M.blue : M.pink), 0, 0.9, 0);
      var head = add(g, new THREE.SphereGeometry(0.27, 40, 26), M.white, 0, 1.55, 0);
      // hair cap: clear of the head everywhere (radius .30, pushed back only .02), dense rim so the hairline is a smooth arc
      var hair = add(g, new THREE.SphereGeometry(0.30, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), i === 2 || i === 4 ? M.hairBlue : M.hairOff, 0, 1.56, -0.02); hair.rotation.x = -0.45;
      [-1, 1].forEach(function (s) { add(g, new THREE.SphereGeometry(0.04, 12, 8), M.ink, s * 0.09, 1.535, 0.255); });
      g.userData = { body: body, head: head };
      world.add(g); return g;
    }
    for (var i = 0; i < 6; i++) seats.push(person(i));

    // cards: face down = sky/pink with a red disc; face up = white with a red heart
    var heartShape = new THREE.Shape(); heartShape.moveTo(0, -0.5); heartShape.bezierCurveTo(-0.95, 0.1, -0.5, 0.85, 0, 0.42); heartShape.bezierCurveTo(0.5, 0.85, 0.95, 0.1, 0, -0.5);
    var heartGeo = new THREE.ShapeGeometry(heartShape);
    // cards are softly rounded squares (radius-md feel): a rounded-rect extrusion in the back colour, a cream face with a lip, the red disc on the back, the finger-heart on the face
    function rrect(w, r) {
      var sh = new THREE.Shape(), x = -w / 2, y = -w / 2, P = Math.PI; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.absarc(x + w - r, y + r, r, -P / 2, 0, false); sh.lineTo(x + w, y + w - r);
      sh.absarc(x + w - r, y + w - r, r, 0, P / 2, false); sh.lineTo(x + r, y + w); sh.absarc(x + r, y + w - r, r, P / 2, P, false); sh.lineTo(x, y + r); sh.absarc(x + r, y + r, r, P, P * 1.5, false); return sh;
    }
    var cardGeo = {};
    function cardGeos(size) {
      var k = String(size); if (cardGeo[k]) return cardGeo[k]; var r = size * 0.13;
      var body = new THREE.ExtrudeGeometry(rrect(size, r), { depth: 0.03, bevelEnabled: false, curveSegments: 10 }); body.translate(0, 0, -0.015); body.rotateX(-Math.PI / 2);
      var face = new THREE.ShapeGeometry(rrect(size * 0.93, r * 0.86), 10); face.rotateX(Math.PI / 2);
      var gh = size * 0.62, gw = gh * glyphAsp, plane = new THREE.PlaneGeometry(gw, gh); plane.rotateX(Math.PI / 2);
      return (cardGeo[k] = { body: body, face: face, glyph: plane, r: r });
    }
    function card(matBack, size) {
      var g = new THREE.Group(), gs = cardGeos(size);
      g.add(new THREE.Mesh(gs.body, matBack));
      var d = add(g, new THREE.CircleGeometry(size * 0.26, 32), M.red, 0, 0.0165, 0); d.rotation.x = -Math.PI / 2;
      add(g, gs.face, M.face, 0, -0.0162, 0);
      var gl = add(g, gs.glyph, M.glyph, 0, -0.0175, 0); gl.renderOrder = 2; gl.userData.glyph = true;
      return g;
    }
    var deck = new THREE.Group(); deck.position.set(0, TOP, 0); world.add(deck);
    for (var c = 0; c < 9; c++) { var cd = card(M.sky, 0.9); cd.position.y = 0.02 + c * 0.032; cd.rotation.y = Math.sin(c * 2.1) * 0.12; deck.add(cd); }
    var topCard = card(M.sky, 0.9); topCard.position.set(0, TOP + 0.02 + 9 * 0.032, 0); topCard.rotation.y = 0.05; world.add(topCard);
    // challenge cards + props (appear at scene 4)
    var chal = new THREE.Group(); chal.visible = false; world.add(chal);
    [[-1.05, 0.55, 0.5], [-0.8, 0.62, 0.12], [-0.55, 0.7, -0.22]].forEach(function (p, n) { var cc = card(M.pink, 0.72); cc.position.set(p[0], TOP + 0.02 + n * 0.02, p[1] + 0.35); cc.rotation.y = p[2]; chal.add(cc); });
    var die = add(chal, new THREE.BoxGeometry(0.34, 0.34, 0.34), M.red, 1.05, TOP + 0.18, 0.55); die.rotation.y = 0.5;
    [[1.3, -0.2, M.blue], [1.05, -0.5, M.sky], [0.72, -0.25, M.white]].forEach(function (p) { add(chal, new THREE.CylinderGeometry(0.14, 0.14, 0.07, 18), p[2], p[0], TOP + 0.05, p[1] + 0.5); });
    // the last card and the rising hearts (scene 5)
    var lastCard = card(M.pink, 0.9); lastCard.visible = false; world.add(lastCard);
    var hearts = []; for (var h = 0; h < 6; h++) { var hm = new THREE.Mesh(heartGeo, M.heart.clone()); hm.visible = false; world.add(hm); hearts.push(hm); }

    G = { THREE: THREE, renderer: renderer, scene: scene, camera: camera, seats: seats, topCard: topCard, chal: chal, lastCard: lastCard, hearts: hearts, paintMats: paintMats, TOP: TOP, cam: { px: 0, py: 8, pz: 10, lx: 0, ly: 1, lz: 0, sx: 0, sy: 0 }, stageAt: -1 };
    els.canvas.hidden = false;
    resize();
  }

  /* camera: aim + fit inside the free rectangle (the part of the screen the chrome does not cover) */
  function freeRect() {
    var W = innerWidth, H = innerHeight, sy = window.scrollY || 0, hb = Math.max(0, els.head.getBoundingClientRect().bottom);
    if (S.phase === 'play') {
      var pr = els.panel.getBoundingClientRect(), tb = els.top.getBoundingClientRect().bottom + 4;
      return { x: 0, y: tb, w: W, h: Math.max(140, pr.top - tb - 4) };
    }
    var r = els.introCard.getBoundingClientRect();
    if (r.width > W * 0.6) { var top = hb + sy > 0 ? Math.max(0, els.head.getBoundingClientRect().bottom + sy) : 0; return { x: 0, y: top - sy < 0 ? 0 : Math.max(0, top), w: W, h: Math.max(160, (r.top + sy) - top - 8) }; }
    var cx = r.left + r.width / 2;
    return cx < W / 2 ? { x: r.right + 16, y: hb, w: W - r.right - 16, h: H - hb } : { x: 0, y: hb, w: r.left - 16, h: H - hb };
  }
  function camFor(i) {
    var fr = freeRect(), k = KF[i], W = innerWidth, H = innerHeight, asp = W / H, tn = Math.tan(G.camera.fov * Math.PI / 360);
    var s = Math.max(0.2, Math.min(fr.h / H, asp * fr.w / W)), d = k.rb / (tn * s);
    var n = Math.sqrt(k.dir[0] * k.dir[0] + k.dir[1] * k.dir[1] + k.dir[2] * k.dir[2]);
    return { px: k.look[0] + k.dir[0] / n * d, py: k.look[1] + k.dir[1] / n * d, pz: k.look[2] + k.dir[2] / n * d, lx: k.look[0], ly: k.look[1], lz: k.look[2], sx: fr.x + fr.w / 2 - W / 2, sy: fr.y + fr.h / 2 - H / 2, fr: fr };
  }
  function applyCam(c) {
    var cam = G.camera, W = innerWidth, H = innerHeight; G.cam = c;
    cam.position.set(c.px, c.py, c.pz); cam.lookAt(c.lx, c.ly, c.lz);
    cam.setViewOffset(W, H, -c.sx, -c.sy, W, H); cam.updateProjectionMatrix();
  }
  function camTo(i, dur) {
    if (!G) return Promise.resolve(); var a = G.cam, b = camFor(i);
    return tw(dur, function (k) { var o = {}; ['px', 'py', 'pz', 'lx', 'ly', 'lz', 'sx', 'sy'].forEach(function (p) { o[p] = a[p] + (b[p] - a[p]) * k; }); applyCam(o); });
  }
  function moveTo(obj, tgt, dur, ease) {
    var f = { p: obj.position.clone(), r: [obj.rotation.x, obj.rotation.y, obj.rotation.z], s: obj.scale.x };
    return tw(dur, function (k) {
      if (tgt.p) obj.position.set(f.p.x + (tgt.p[0] - f.p.x) * k, f.p.y + (tgt.p[1] - f.p.y) * k, f.p.z + (tgt.p[2] - f.p.z) * k);
      if (tgt.r) obj.rotation.set(f.r[0] + (tgt.r[0] - f.r[0]) * k, f.r[1] + (tgt.r[1] - f.r[1]) * k, f.r[2] + (tgt.r[2] - f.r[2]) * k);
      if (tgt.s != null) obj.scale.setScalar(Math.max(0.0001, f.s + (tgt.s - f.s) * k));
    }, ease || easeInOut);
  }
  function popIn(obj, on, dur) {
    if (on) { obj.visible = true; if (obj.scale.x > 0.9) obj.scale.setScalar(0.0001); return moveTo(obj, { s: 1 }, dur || 520, easeBack); }
    return moveTo(obj, { s: 0.0001 }, dur || 240, easeOut).then(function () { obj.visible = false; });
  }

  /* what is on the table at each stop; idempotent, so any stop can be jumped to */
  function stage(i, animate) {
    if (!G) return; var d = animate ? 520 : 0, T = G.TOP;
    var friends = FRIENDS_AT[i];
    G.seats.forEach(function (sg, n) {
      var idx = n === 0 ? -1 : FRIEND_ORDER.indexOf(n), want = n === 0 ? i >= 1 : idx < friends;
      if (want && !sg.visible) popIn(sg, true, d || 1); else if (!want && sg.visible) { sg.visible = false; }
      if (!animate && want) { sg.visible = true; sg.scale.setScalar(1); }
    });
    var tc = G.topCard;
    if (i < 2) moveTo(tc, { p: [0, T + 0.02 + 9 * 0.032, 0], r: [0, 0.05, 0], s: 1 }, d);
    else if (i === 2) moveTo(tc, { p: [0, T + 0.85, 0.75], r: [Math.PI + 0.9, 0.0, 0], s: 1.5 }, animate ? 1000 : 0, easeInOut);
    else moveTo(tc, { p: [1.2, T + 0.02, -0.55], r: [Math.PI, 0.5, 0], s: 1 }, animate ? 700 : 0);
    if (i >= 3) { if (!G.chal.visible) { G.chal.visible = true; if (animate) { G.chal.scale.setScalar(0.0001); moveTo(G.chal, { s: 1 }, 600, easeBack); } else G.chal.scale.setScalar(1); } }
    else G.chal.visible = false;
    var lc = G.lastCard;
    if (i === 4) {
      lc.visible = true; lc.rotation.set(0, 0.2, 0); lc.scale.setScalar(1); lc.position.set(0, T + 0.02 + 9 * 0.032, 0);
      if (animate) { moveTo(lc, { p: [0, T + 1.3, 0.2], r: [Math.PI + 0.6, 0, 0], s: 1.4 }, 900, easeInOut).then(riseHearts); } else { moveTo(lc, { p: [0, T + 1.3, 0.2], r: [Math.PI + 0.6, 0, 0], s: 1.4 }, 0); }
    } else lc.visible = false;
    if (i === 4) { G.topCard.visible = true; }
    render();
  }
  function riseHearts() {
    if (reduced() || !G) return;
    G.hearts.forEach(function (hm, n) {
      hm.visible = true; hm.material.opacity = 0; var x0 = (n - 2.5) * 0.55, y0 = G.TOP + 1.6;
      setTimeout(function () {
        tw(1500, function (k) { hm.position.set(x0 + Math.sin(k * 5 + n) * 0.15, y0 + k * 2.2, 0.6); hm.scale.setScalar(0.16 + 0.14 * Math.sin(Math.min(1, k * 3) * Math.PI / 2)); hm.material.opacity = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8; hm.quaternion.copy(G.camera.quaternion); }, easeOut).then(function () { hm.visible = false; });
      }, n * 130);
    });
  }
  function hop() {
    if (!G) return; var you = G.seats[0]; if (!you.visible) return;
    moveTo(you, { p: [you.position.x, 0.4, you.position.z] }, 160, easeOut).then(function () { return moveTo(you, { p: [you.position.x, 0, you.position.z] }, 380, easeBack); });
  }

  function resize() {
    if (S.mode === 'flat') { layoutFlat(); return; }
    if (!G) return;
    var W = innerWidth, H = innerHeight; G.renderer.setSize(W, H, false); G.camera.aspect = W / H;
    applyCam(camFor(Math.min(S.i, 4)));
    render();
  }

  /* ================= flat fallback (SVG, same content, same play) ================= */
  var FLAT = { built: false, people: [], lift: null };
  function buildFlat() {
    if (FLAT.built) return; FLAT.built = true;
    var cx = 200, cy = 150, parts = [], people = [];
    for (var i = 0; i < 6; i++) { var th = Math.PI / 2 + i * Math.PI / 3; people.push({ i: i, s: Math.sin(th), x: cx + Math.cos(th) * 150, y: cy + 8 + Math.sin(th) * 84 }); }
    people.sort(function (a, b) { return a.y - b.y; });
    var back = people.filter(function (p) { return p.y < cy + 8; }), front = people.filter(function (p) { return p.y >= cy + 8; });
    // every pawn faces the table, like the 3D scene: the back three look out at you, the front three are seen from behind
    function person(p) {
      var you = p.i === 0, bc = you ? 'f-me' : (p.i % 2 ? 'f-b0' : 'f-b1'), hc = (p.i === 2 || p.i === 4) ? 'f-hairb' : 'f-hair', hx = p.x, hy = p.y - 16, head;
      if (p.s < 0) { // facing the viewer: cream face, hair on top, two dot eyes
        head = '<circle class="f-skin" cx="' + hx + '" cy="' + hy + '" r="11"/><path class="' + hc + '" d="M' + (hx - 11.8) + ' ' + (hy - 1) + 'a11.8 11.8 0 0 1 23.6 0c-6.5-5.5-17-5.5-23.6 0z"/>' +
          '<circle class="f-eye" cx="' + (hx - 4) + '" cy="' + (hy + 1.4) + '" r="1.5"/><circle class="f-eye" cx="' + (hx + 4) + '" cy="' + (hy + 1.4) + '" r="1.5"/>';
      } else { // seen from behind: hair covers the head, a thin cream nape (and, at the sides, a cheek toward the table)
        var side = Math.abs(p.x - cx) > 20 ? (p.x < cx ? 1 : -1) : 0;
        head = '<circle class="f-skin" cx="' + hx + '" cy="' + hy + '" r="11"/><circle class="' + hc + '" cx="' + (hx - side * 2.4) + '" cy="' + (hy - 1.6) + '" r="11.2"/>';
      }
      return '<g class="f-p is-off" data-seat="' + p.i + '"><ellipse class="f-shadow" cx="' + p.x + '" cy="' + (p.y + 26) + '" rx="22" ry="7"/><path class="' + bc + '" d="M' + (p.x - 17) + ' ' + (p.y + 26) + 'q2-34 17-34t17 34z"/>' + head + '</g>';
    }
    var rug = '<g class="f-rugs" transform="translate(200 158) scale(3.6 2.2) translate(-50 -50)">' +
      RUG.m.map(function (r) { return '<path class="m" d="' + r[0] + '" stroke-width="' + r[1] + '"/>'; }).join('') +
      RUG.m.map(function (r) { return '<path class="h" d="' + r[0] + '" transform="translate(0 -4)" stroke-width="1.1" stroke-dasharray="9 2.5 16 3.5 6 2" vector-effect="non-scaling-stroke"/>'; }).join('') +
      RUG.a.map(function (r) { return '<path class="a" d="' + r[0] + '" stroke-width="' + r[1] + '"/>'; }).join('') + '</g>';
    parts.push(rug);
    back.forEach(function (p) { parts.push(person(p)); });
    parts.push('<ellipse class="f-shadow" cx="200" cy="184" rx="112" ry="30"/><ellipse class="f-rim" cx="200" cy="156" rx="112" ry="56"/><ellipse class="f-table" cx="200" cy="150" rx="108" ry="52"/>');
    parts.push('<g><rect class="f-card-back" x="182" y="136" width="36" height="36" rx="6" transform="rotate(-4 200 154)"/><circle class="f-red" cx="200" cy="154" r="9" transform="rotate(-4 200 154)"/></g>');
    parts.push('<g class="f-lift is-off" data-part="lift"><ellipse class="f-shadow" cx="200" cy="166" rx="34" ry="6"/><rect class="f-card-back" x="170" y="100" width="60" height="60" rx="10"/><rect class="f-card-face" x="173" y="103" width="54" height="54" rx="8"/><image href="' + GLYPH + '" x="' + (200 - 15.6) + '" y="107" width="31.2" height="46" preserveAspectRatio="xMidYMid meet"/></g>');
    parts.push('<g class="f-lift is-off" data-part="chal"><rect class="f-pinkcard" x="120" y="150" width="30" height="30" rx="5" transform="rotate(-14 135 165)"/><circle class="f-red" cx="135" cy="165" r="6" transform="rotate(-14 135 165)"/><rect class="f-pinkcard" x="132" y="146" width="30" height="30" rx="5" transform="rotate(-2 147 161)"/><circle class="f-red" cx="147" cy="161" r="6" transform="rotate(-2 147 161)"/><rect class="f-red" x="240" y="152" width="18" height="18" rx="4" transform="rotate(20 249 161)"/></g>');
    front.forEach(function (p) { parts.push(person(p)); });
    els.flat.innerHTML = '<svg viewBox="0 0 400 300" role="presentation" focusable="false">' + parts.join('') + '</svg>';
  }
  function layoutFlat() {
    var fr = freeRect(); els.flat.style.left = fr.x + 'px'; els.flat.style.top = fr.y + 'px'; els.flat.style.width = fr.w + 'px'; els.flat.style.height = fr.h + 'px';
  }
  function stageFlat(i) {
    buildFlat(); var friends = FRIENDS_AT[i];
    els.flat.querySelectorAll('[data-seat]').forEach(function (g) {
      var n = +g.getAttribute('data-seat'), idx = FRIEND_ORDER.indexOf(n), want = n === 0 ? i >= 1 : idx < friends; g.classList.toggle('is-off', !want);
    });
    els.flat.querySelector('[data-part="lift"]').classList.toggle('is-off', !(i === 2 || i === 4));
    els.flat.querySelector('[data-part="chal"]').classList.toggle('is-off', i < 3);
  }
  function stageAny(i, animate) { if (S.mode === 'flat') stageFlat(i); else stage(i, animate); }

  /* ================= probe: WebGL 2 first, three.js only after it passes ================= */
  function probeGL() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2')); } catch (e) { return false; } }
  function load3() { return new Promise(function (ok, no) { if (window.THREE) return ok(); var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5h.01"/><circle cx="12" cy="12" r="9"/></svg>';
  var probeWhy = 'ok'; // ok | nogl | loadfail | forced
  function paintProbe() {
    var box = $('#jr-probe'), msg = $('#jr-probe-msg'), tg = $('#jr-probe-toggle'), flat = S.mode === 'flat';
    box.classList.toggle('is-flat', flat); $('#jr-probe-ic').innerHTML = flat ? ICON_WARN : ICON_OK;
    var m = {
      ok: ['جهازك يدعم المشهد ثلاثي الأبعاد، والطاولة جاهزة.', 'Your device supports the 3D scene, and the table is ready.'],
      nogl: ['جهازك أو متصفحك ما بيدعم المشهد ثلاثي الأبعاد. رح تكمل الرحلة بنسخة مسطحة: نفس المحطات ونفس النتيجة.', 'Your device or browser cannot show the 3D scene. You will play a flat version instead: the same stops and the same result.'],
      loadfail: ['ما قدرنا نحمّل المشهد ثلاثي الأبعاد. رح تكمل الرحلة بنسخة مسطحة: نفس المحطات ونفس النتيجة. جرّب تعمل تحديث للصفحة.', 'The 3D scene did not load. You will play a flat version instead: the same stops and the same result. You can try refreshing the page.'],
      forced: ['إنت اخترت النسخة المسطحة: نفس المحطات ونفس النتيجة.', 'You chose the flat version: the same stops and the same result.']
    }[S.mode === 'probing' ? 'ok' : (flat ? probeWhy : 'ok')];
    if (S.mode === 'probing') { msg.textContent = t('بنفحص جهازك…', 'Checking your device…'); tg.hidden = true; return; }
    msg.textContent = t(m[0], m[1]);
    // prototype control so the fallback can be previewed (and undone)
    tg.hidden = !(G || probeWhy === 'forced');
    tg.textContent = flat ? t('جرّب المشهد ثلاثي الأبعاد', 'Try the 3D scene') : t('جرّب النسخة المسطحة (للمعاينة)', 'Preview the flat version');
  }
  function useFlat(why) {
    S.mode = 'flat'; probeWhy = why; els.canvas.hidden = true; els.flat.hidden = false; buildFlat(); layoutFlat(); stageFlat(Math.min(S.i, 4)); paintProbe();
  }
  function use3D() { S.mode = '3d'; els.flat.hidden = true; els.canvas.hidden = false; probeWhy = 'ok'; resize(); stageAny(Math.min(S.i, 4), false); paintProbe(); }
  function boot() {
    paintProbe();
    if (S.forceFlat) return useFlat('forced');
    if (!probeGL()) return useFlat('nogl');
    load3().then(function () { init3D(); S.mode = '3d'; probeWhy = 'ok'; stage(0, false); resize(); paintProbe(); }).catch(function () { useFlat('loadfail'); });
  }
  $('#jr-probe-toggle').addEventListener('click', function () {
    if (S.mode === 'flat') { S.forceFlat = false; if (G) use3D(); else { S.mode = 'probing'; paintProbe(); boot(); } }
    else { S.forceFlat = true; useFlat('forced'); }
  });

  /* ================= phases ================= */
  function setPhase(p) {
    S.phase = p; S.gen++; document.body.setAttribute('data-phase', p);
    els.intro.hidden = p !== 'intro'; els.play.hidden = p !== 'play'; els.result.hidden = p !== 'result'; els.head.hidden = p === 'play';
    var show = p !== 'result'; els.canvas.classList.toggle('is-off', !show); els.flat.classList.toggle('is-off', !show);
    window.scrollTo(0, 0);
    if (p === 'result') DC.draw($('#jr-stroke'));
    requestAnimationFrame(relayout);
  }
  function relayout() { document.documentElement.style.setProperty('--panel-h', (S.phase === 'play' ? els.panel.offsetHeight : 0) + 'px'); resize(); }
  function whereText() { var n = S.i + 1, s = SCENES[S.i]; return '<span class="n">' + t('المحطة ', 'Stop ') + '<span class="dc-num">' + n + '</span>' + t(' من ', ' of ') + '<span class="dc-num">5</span></span><span class="nm">· ' + esc(t(s.name[0], s.name[1])) + '</span>'; }
  function paintScene() {
    var s = SCENES[S.i];
    $('#jr-where').innerHTML = whereText();
    $('#jr-progress').innerHTML = SCENES.map(function (_, n) { return '<i class="' + (n < S.i ? 'is-done' : n === S.i ? 'is-now' : '') + '"></i>'; }).join('');
    $('#jr-prompt').textContent = t(s.q[0], s.q[1]);
    var pk = S.picks[S.i];
    $('#jr-choices').innerHTML = s.c.map(function (c, n) { return '<button type="button" class="dc-choice' + (pk === n ? ' is-picked' : '') + '" data-n="' + n + '"><b class="dc-num">' + (n + 1) + '</b>' + esc(t(c[0], c[1])) + '</button>'; }).join('');
    els.panel.classList.toggle('is-chosen', pk != null);
  }
  function enterScene(animate, focus) {
    S.busy = false; paintScene(); stageAny(S.i, animate); if (G && S.mode === '3d') camTo(S.i, animate ? 1100 : 0);
    requestAnimationFrame(function () { relayout(); if (focus) $('#jr-prompt').focus({ preventScroll: true }); });
  }
  function start() {
    hideToast(); S.picks = []; S.i = 0; S.saved = false; S.typeKey = null; setPhase('play'); beep('flip');
    // (re)build the panel first so the camera can fit the free area above it
    paintScene(); stageAny(0, false); relayout(); if (G && S.mode === '3d') { var b = camFor(0); applyCam(b); render(); }
    $('#jr-prompt').focus({ preventScroll: true });
  }
  function pick(n) {
    if (S.busy || S.phase !== 'play') return; S.busy = true; S.picks[S.i] = n;
    var btns = $('#jr-choices').querySelectorAll('.dc-choice');
    btns.forEach(function (b, k) { b.classList.toggle('is-picked', k === n); b.setAttribute('aria-disabled', 'true'); if (k === n) b.setAttribute('aria-current', 'true'); });
    els.panel.classList.add('is-chosen'); beep('pick'); if (S.mode === '3d') hop();
    var gen = S.gen;
    setTimeout(function () { if (gen !== S.gen) return; if (S.i < SCENES.length - 1) { S.i++; enterScene(true, true); beep('flip'); } else finish(); }, reduced() ? 260 : 950);
  }
  $('#jr-choices').addEventListener('click', function (e) { var b = e.target.closest('.dc-choice'); if (b) pick(+b.getAttribute('data-n')); });
  document.addEventListener('keydown', function (e) {
    if (S.phase !== 'play' || $('#jr-gate').open || e.ctrlKey || e.metaKey || e.altKey) return;
    var m = { '1': 0, '2': 1, '3': 2, '١': 0, '٢': 1, '٣': 2 }[e.key]; if (m != null) { e.preventDefault(); pick(m); }
  });
  $('#jr-exit').addEventListener('click', function () {
    var snap = S.picks.length ? { i: S.i, picks: S.picks.slice() } : null; // leaving is cheap at stop 1, costly later: offer a 5 second way back
    S.picks = []; S.i = 0; S.busy = false; setPhase('intro'); stageAny(0, false); requestAnimationFrame(function () { relayout(); $('#jr-start').focus(); });
    if (snap) actionToast(t('رجعت للبداية.', 'Back at the start.'), t('رجّعني للمحطة ', 'Back to stop ') + (snap.i + 1), function () {
      S.picks = snap.picks; S.i = snap.i; S.typeKey = null; S.busy = false; setPhase('play'); paintScene(); stageAny(S.i, false); relayout();
      if (G && S.mode === '3d') { applyCam(camFor(S.i)); render(); }
      $('#jr-prompt').focus({ preventScroll: true });
    });
  });
  $('#jr-start').addEventListener('click', start);
  window.addEventListener('resize', function () { relayout(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (S.phase === 'play') relayout(); }).observe(els.panel);

  /* ================= scoring (prototype: in the real build this runs on the server only) ================= */
  function score() {
    var sc = [0, 0, 0, 0]; S.picks.forEach(function (n, i) { SCENES[i].w[n].forEach(function (v, k) { sc[k] += v; }); });
    var ratios = sc.map(function (v, k) { return v / MAXES[k]; });
    var order = sc.map(function (v, k) { return k; }).sort(function (a, b) { return sc[b] - sc[a] || a - b; });
    var top = order[0], second = order[1], key;
    if (sc[order[0]] - sc[order[3]] <= 3) key = 'balanced';
    else if (((top === 0 && second === 3) || (top === 3 && second === 0)) && sc[top] - sc[second] <= 1) key = 'bridge';
    else key = ['warm', 'curious', 'spark', 'listener'][top];
    return { key: key, ratios: ratios };
  }
  function finish() {
    var r = score(); S.typeKey = r.key; S.ratios = r.ratios; beep('result');
    if (G && S.mode === '3d') { camTo(4, 0); }
    setPhase('result'); paintResult(); revealState(false);
    requestAnimationFrame(function () { $('#jr-reveal').focus({ preventScroll: true }); });
  }

  /* ================= result ================= */
  function level(v) { return v < 0.34 ? t('هادئ', 'Quiet') : v < 0.62 ? t('حاضر', 'Present') : t('قوي', 'Strong'); }
  function paintResult() {
    if (!S.typeKey) return; var ty = TYPES[S.typeKey], rev = $('#jr-reveal').classList.contains('is-flipped');
    $('#jr-typename').textContent = t(ty.name[0], ty.name[1]); $('#jr-typeline').textContent = t(ty.line[0], ty.line[1]);
    $('#jr-result-name').textContent = t(ty.name[0], ty.name[1]); $('#jr-result-body').textContent = t(ty.body[0], ty.body[1]);
    $('#jr-box-text').textContent = t(ty.boxText[0], ty.boxText[1]);
    var bx = BOXES[ty.box], bl = $('#jr-box-link'), ba = $('#jr-box-alt'), lq = DC.lang === 'en' ? '&lang=en' : '', tq = DC.theme === 'dark' ? '&theme=dark' : '';
    bl.textContent = t(bx.cta[0], bx.cta[1]); bl.setAttribute('href', 'product.html?box=' + ty.box + lq + tq);
    ba.hidden = !ty.alt; if (ty.alt) { var al = BOXES[ty.alt]; ba.textContent = t(al.alt[0], al.alt[1]); ba.setAttribute('href', 'product.html?box=' + ty.alt + lq + tq); }
    var qi = QUOTES[ty.q]; $('#jr-quote').textContent = t(qi[0], qi[1]);
    var R = S.ratios || ty.prof;
    $('#jr-traits').innerHTML = TRAITS.map(function (tr, k) { return '<li class="dc-jr-trait"><span class="dc-jr-trait__n">' + esc(t(tr.ar, tr.en)) + '</span><span class="dc-jr-trait__m" aria-hidden="true"><i style="width:' + (rev ? Math.round(R[k] * 100) : 0) + '%" data-w="' + Math.round(R[k] * 100) + '"></i></span><span class="dc-jr-trait__l">' + level(R[k]) + '</span></li>'; }).join('');
    $('#jr-reveal').setAttribute('aria-label', rev ? (S.shared ? t('بطاقة صاحبك: ', 'A friend’s card: ') : t('نتيجتك: ', 'Your result: ')) + t(ty.name[0], ty.name[1]) : t('اقلب البطاقة لتشوف نتيجتك', 'Flip the card to see your result'));
    paintShared();
  }
  /* recipient variant (?result=<type>&shared=1): a friend's card, not the viewer's. No save, no share, no gate; the CTA starts their own journey. */
  function setText(el, ar, en) { el.setAttribute('data-ar', ar); el.setAttribute('data-en', en); el.textContent = t(ar, en); }
  function paintShared() {
    var sh = S.shared;
    setText($('#jr-chip'), sh ? 'بطاقة صاحبك' : 'بطاقتك', sh ? 'A friend’s card' : 'Your card');
    setText($('#jr-kicker'), sh ? 'بطاقة صاحبك' : 'نتيجتك', sh ? 'A friend’s card' : 'Your card');
    setText($('#jr-traits-h'), sh ? 'كيف ظهرت اختيارات صاحبك' : 'كيف ظهرت اختياراتك', sh ? 'How your friend’s choices added up' : 'How your choices added up');
    $('#jr-shared-note').hidden = !sh; $('#jr-take').hidden = !sh;
    $('#jr-save').hidden = sh; $('#jr-share').hidden = sh; $('#jr-again').hidden = sh; $('#jr-gatehint').hidden = sh || S.saved;
  }
  $('#jr-take').addEventListener('click', function () {
    S.shared = false; S.typeKey = null; S.picks = []; S.i = 0; S.saved = false;
    try { var u = new URL(location.href); u.searchParams.delete('result'); u.searchParams.delete('shared'); history.replaceState(history.state, '', u); } catch (e) {}
    paintShared(); paintSaved(); DC.flip($('#jr-reveal'), false); setPhase('intro'); stageAny(0, false); requestAnimationFrame(function () { relayout(); $('#jr-start').focus(); });
  });
  function revealState(on) {
    var card = $('#jr-reveal'), col = $('#jr-cardcol'), r0 = col.getBoundingClientRect();
    DC.flip(card, on); $('#jr-detail').hidden = !on; els.result.setAttribute('data-face', on ? 'up' : 'down'); paintResult();
    // the card slides from the centre to its column instead of jumping (skipped under reduced motion)
    var r1 = col.getBoundingClientRect(), dx = r0.left - r1.left;
    if (!reduced() && Math.abs(dx) > 2 && r0.width) {
      col.style.transition = 'none'; col.style.transform = 'translateX(' + dx + 'px)'; void col.offsetWidth;
      col.style.transition = 'transform var(--dur-slow) var(--ease-out)'; col.style.transform = '';
      setTimeout(function () { col.style.transition = ''; }, 700);
    }
    if (on) {
      DC.draw($('#jr-underline'));
      requestAnimationFrame(function () { document.querySelectorAll('#jr-traits i').forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); });
    }
  }
  $('#jr-reveal').addEventListener('click', function () {
    var was = this.classList.contains('is-flipped'); if (was) return; beep('flip'); revealState(true);
    setTimeout(function () { $('#jr-result-title').focus({ preventScroll: false }); }, reduced() ? 0 : 500);
  });
  $('#jr-again').addEventListener('click', function () { S.picks = []; S.i = 0; S.typeKey = null; S.saved = false; paintSaved(); DC.flip($('#jr-reveal'), false); setPhase('intro'); stageAny(0, false); requestAnimationFrame(function () { relayout(); $('#jr-start').focus(); }); });

  /* ================= save / share gate ================= */
  var gate = $('#jr-gate');
  function paintSaved() {
    $('#jr-saved').hidden = !S.saved; $('#jr-gatehint').hidden = S.saved || S.shared;
    $('#jr-save-t').textContent = S.saved ? t('تحديث بياناتي', 'Update my details') : t('احفظ نتيجتي', 'Save my result');
    // once saved, Share is the next step: it takes the red primary, Update steps back to a quiet ghost
    var sv = $('#jr-save'), sh = $('#jr-share');
    sv.classList.toggle('dc-btn--cta', !S.saved); sv.classList.toggle('dc-btn--ghost', S.saved); sv.querySelector('.dc-heart').style.display = S.saved ? 'none' : '';
    sh.classList.toggle('dc-btn--cta', S.saved); sh.classList.toggle('dc-btn--outline', !S.saved);
    $('#jr-actions').classList.toggle('is-saved', S.saved);
  }
  function openGate(from) { S.lastFocus = from; gate.showModal(); $('#jr-contact').focus(); }
  function closeGate() { if (gate.open) gate.close(); if (S.lastFocus) S.lastFocus.focus(); }
  $('#jr-save').addEventListener('click', function () { openGate(this); });
  $('#jr-share').addEventListener('click', function () { if (!S.saved) return openGate(this); share(); });
  $('#jr-gate-x').addEventListener('click', closeGate); $('#jr-gate-cancel').addEventListener('click', closeGate);
  gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });
  gate.addEventListener('cancel', function () { if (S.lastFocus) setTimeout(function () { S.lastFocus.focus(); }, 0); });
  $('#jr-gate-form').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#jr-contact').value.trim(), okc = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.replace(/\D/g, '').length >= 9, okk = $('#jr-consent').checked;
    var f = $('#jr-contact-f'), h = $('#jr-contact-h');
    f.classList.toggle('dc-field--error', !okc); $('#jr-contact').setAttribute('aria-invalid', String(!okc));
    if (!okc) { h.textContent = t('اكتب بريدًا إلكترونيًا أو رقم هاتف صحيح.', 'Enter a valid email address or phone number.'); h.setAttribute('data-ar', 'اكتب بريدًا إلكترونيًا أو رقم هاتف صحيح.'); h.setAttribute('data-en', 'Enter a valid email address or phone number.'); }
    else { h.setAttribute('data-ar', 'مثال: name@example.com أو 059 000 0000'); h.setAttribute('data-en', 'For example: name@example.com or 059 000 0000'); h.textContent = t('مثال: name@example.com أو 059 000 0000', 'For example: name@example.com or 059 000 0000'); }
    $('#jr-consent-e').hidden = okk; $('#jr-consent').setAttribute('aria-invalid', String(!okk));
    if (!okc) return $('#jr-contact').focus(); if (!okk) return $('#jr-consent').focus();
    S.saved = true; paintSaved(); closeGate(); toast(t('تم حفظ نتيجتك. بتقدر تشاركها هلأ.', 'Your result is saved. You can share it now.'));
  });
  $('#jr-consent').addEventListener('change', function () { if (this.checked) { this.setAttribute('aria-invalid', 'false'); $('#jr-consent-e').hidden = true; } });
  function shareUrl() { var u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('result', S.typeKey); u.searchParams.set('shared', '1'); if (DC.lang === 'en') u.searchParams.set('lang', 'en'); return u.toString(); }
  function share() {
    var url = shareUrl(), ty = TYPES[S.typeKey], txt = t('نتيجتي بالرحلة: ', 'My Journey result: ') + t(ty.name[0], ty.name[1]);
    if (navigator.share) { navigator.share({ title: 'Dardachat', text: txt, url: url }).catch(function () {}); return; }
    var fallback = function () { toast(t('انسخ الرابط:', 'Copy this link:'), url); };
    var done = function () { toast(t('نسخنا الرابط. الصقه وين ما بدك.', 'Link copied. Paste it wherever you like.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  }

  /* ================= language / theme ================= */
  document.addEventListener('dc:lang', function () {
    paintSound(); paintProbe(); if (S.phase === 'play') { paintScene(); } if (S.phase === 'result') { paintResult(); paintSaved(); } relayout();
    if ($('#jr-contact-f').classList.contains('dc-field--error')) { /* keep the visible error text in the new language */ $('#jr-contact-h').textContent = t('اكتب بريدًا إلكترونيًا أو رقم هاتف صحيح.', 'Enter a valid email address or phone number.'); }
  });
  document.addEventListener('dc:theme', function () { if (G) { G.paintMats(); render(); } });
  document.addEventListener('dc:motion', function () { if (G) render(); });

  /* ================= go ================= */
  paintSound(); paintSaved();
  var pre = Q.get('result');
  if (pre && TYPES[pre]) { S.typeKey = pre; S.ratios = null; setPhase('result'); paintResult(); revealState(true); }
  else { S.shared = false; setPhase('intro'); }
  boot();
  var qs = Q.get('stop'); // preview helper: journey.html?stop=3 jumps into the play view at that stop
  if (qs && +qs >= 1 && +qs <= 5) { S.i = +qs - 1; setPhase('play'); paintScene(); (function wait() { if (S.mode === 'probing') return setTimeout(wait, 100); stageAny(S.i, false); relayout(); })(); }
});
