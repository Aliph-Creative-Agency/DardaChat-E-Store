# Builds services.html from services.src.html by filling the workshop cards (repeated markup).
# Run: python _build/gen_services.py   (from design/prototypes)
import os, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
def wa(ar):  # static Arabic fallback link (JS rebuilds it per language)
    return 'https://wa.me/972543992424?text=' + urllib.parse.quote('مرحبًا دردشات، أودّ الاستفسار عن حجز «%s»' % ar)
HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/></svg>'
HEARTPOP = '<svg class="dc-heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>'
# id, group tag, ar title, en title, ar desc, en desc, chips[(ar,en,cls)], person, group, dur(ar,en)
W = [
 ('gift','groups','ورشة هدية لذاتي','A Gift to Myself',
  'تفكير إيجابي ينتهي بلوحة أهداف سنوية تصنعونها بأيديكم وتعلّقونها في بيتكم.',
  'Positive thinking that ends in an annual goals board you make by hand and hang at home.',
  [], '130'[:0]+'100','1300–1500',('ساعتان','2 hours')),
 ('shape','groups','ورشة شكل وحس','Shape & Feel',
  'نفهم المشاعر السلبية ونعبّر عنها بتشكيل الطين، جلسة هادئة تترك في اليد شيئًا نلمسه.',
  'We make sense of difficult feelings by shaping them in clay, a calm session that leaves you something to hold.',
  [], '120','1400–1700',('ساعتان','2 hours')),
 ('stitch','groups','ورشة سؤال وغرزة','A Question and a Stitch',
  'أسئلة عميقة من دردشات مع تطريز فلسطيني، جلسة حوارية دافئة تركّز على العمل اليدوي لتعزيز التواصل مع النفس.',
  'Deep Dardachat questions with Palestinian embroidery: a warm dialogue session built around handwork, to connect with yourself.',
  [], '130','1250–1700',('ساعتان ونصف','2.5 hours')),
 ('alike','mothers','ورشة متشابه بمشاعرنا','Alike in Our Feelings',
  'للأمهات وأبنائهن من عمر 10 إلى 16 سنة: رسم على حقائب قماشية وتعرّف على علم نفس الألوان.',
  'For mothers and their children aged 10 to 16: painting on tote bags and getting to know colour psychology.',
  [('أمهات وأبناء','Mothers & children','dc-chip--pink'),('10–16 سنة','Ages 10–16','dc-chip--outline')], '100','1800–2000',('ساعتان','2 hours')),
 ('roses','couples','ورشة الورود مع الحب','Roses with Love',
  'للأزواج: تنسيق الورد معًا بين اثنين. المقاعد محدودة، من 8 إلى 10 أشخاص فقط.',
  'For couples: arranging flowers side by side. Seats are limited, 8 to 10 people only.',
  [('+18','18+','dc-chip--age'),('للأزواج','Couples','dc-chip--pink')], '180','1500–1800',('ساعتان','2 hours')),
 ('lovestitch','couples','ورشة سؤال بالحب وغرزة من القلب','A Question of Love, a Stitch from the Heart',
  'للأزواج: أسئلة بالحب وتطريز على صورة تجمعكما، تخرجون منها بقطعة تذكارية.',
  'For couples: questions about love and embroidery on a photo of the two of you, and a keepsake to take home.',
  [('+18','18+','dc-chip--age'),('للأزواج','Couples','dc-chip--pink')], '150','1500–1700',('3 ساعات','3 hours')),
]

H = '<path class="k3" transform="translate(%s %s) scale(%s)" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
ART = {  # id: (ground, svg body)  flat placeholder art, palette classes k1..k5 (see services.src.html)
 'gift': ('pink', '<rect class="k4" x="44" y="10" width="72" height="58" rx="8"/><rect class="k2" x="54" y="20" width="24" height="16" rx="4"/><rect class="k1" x="84" y="20" width="22" height="16" rx="4"/><rect class="k1" x="54" y="42" width="24" height="16" rx="4"/>' + H % (86, 38, 1.15)),
 'shape': ('sky', '<path class="k1" d="M50 64C42 44 54 22 78 20s36 14 32 38c-1 6-7 7-13 6-9-1-15 3-24 3-9 0-19 2-23-3z"/><ellipse class="k3" cx="108" cy="52" rx="9" ry="7"/><path class="k5" d="M68 38q6 4 12 0M72 48q6 4 12 0"/>'),
 'stitch': ('pink', '<rect class="k4" x="40" y="12" width="80" height="60" rx="6"/><path class="k5" stroke-dasharray="5 6" d="M48 56c14-22 28 12 44-6s16-14 22-8"/><path class="k5" style="stroke:var(--red)" d="M96 18l20 18"/><circle class="k3" cx="96" cy="18" r="3"/>'),
 'alike': ('sky', '<path class="k4" d="M48 30h64l4 40H44z"/><path class="k5" d="M64 30c0-18 32-18 32 0"/><circle class="k1" cx="66" cy="52" r="8"/><circle class="k2" cx="92" cy="60" r="6"/>' + H % (74, 34, 1.3)),
 'roses': ('pink', ''.join('<path class="k5" d="M%d %d q3 14 -1 30"/><circle class="k1" cx="%d" cy="%d" r="8"/><circle class="k1" cx="%d" cy="%d" r="8"/><circle class="k1" cx="%d" cy="%d" r="8"/><circle class="k3" cx="%d" cy="%d" r="6"/>' % (x, y + 6, x - 7, y, x + 7, y, x, y - 7, x, y) for x, y in ((54, 36), (80, 26), (106, 38)))),
 'lovestitch': ('sky', '<rect class="k4" x="44" y="10" width="72" height="62" rx="6"/><rect class="k1" x="54" y="20" width="52" height="42" rx="4"/><rect class="k5" fill="none" stroke-dasharray="4 5" x="49" y="15" width="62" height="52" rx="5"/>' + H % (68, 30, 1.9)),
 'imagination': ('pink', '<rect class="k4" transform="rotate(-12 62 44)" x="40" y="16" width="46" height="52" rx="6"/><rect class="k2" transform="rotate(0 80 44)" x="58" y="14" width="46" height="52" rx="6"/><rect class="k1" transform="rotate(12 98 44)" x="76" y="16" width="46" height="52" rx="6"/>' + H % (67, 28, 1.3)),
 'between': ('sky', '<rect class="k1" transform="rotate(-12 62 44)" x="40" y="16" width="46" height="52" rx="6"/><rect class="k4" transform="rotate(0 80 44)" x="58" y="14" width="46" height="52" rx="6"/><rect class="k2" transform="rotate(12 98 44)" x="76" y="16" width="46" height="52" rx="6" style="fill:var(--pink)"/>' + H % (67, 28, 1.3)),
}
def art(id_):
    g, body = ART[id_]
    return '<div class="dc-svc-art dc-svc-art--%s" aria-hidden="true"><svg viewBox="0 0 160 84" preserveAspectRatio="xMidYMid slice">%s</svg></div>' % (g, body)

def card(i, w):
    id_, grp, ar, en, dar, den, chips, pp, g, dur = w
    ch = ''.join('<span class="dc-chip %s" data-ar="%s" data-en="%s">%s</span>' % (c, a, e, a) for a, e, c in chips)
    ch = '<div class="dc-svc-chips">%s</div>' % ch if ch else ''
    return f'''      <article class="dc-service dc-svc-card" data-rv data-grp="{grp}" style="--i:{i % 3}" id="ws-{id_}">
        {art(id_)}<div class="dc-svc-titlebox">{ch}<h3 class="dc-service__title" data-ar="{ar}" data-en="{en}">{ar}</h3></div>
        <p class="dc-service__desc" data-ar="{dar}" data-en="{den}">{dar}</p>
        <dl class="dc-service__facts">
          <div><dt data-ar="للفرد" data-en="Per person">للفرد</dt><dd class="dc-num">₪{pp}</dd></div>
          <div><dt data-ar="للمجموعة" data-en="Per group">للمجموعة</dt><dd class="dc-num">₪{g}</dd></div>
          <div><dt data-ar="المدة" data-en="Duration">المدة</dt><dd data-ar="{dur[0]}" data-en="{dur[1]}">{dur[0]}</dd></div>
        </dl>
        <a class="dc-btn dc-btn--cta" href="{wa(ar)}" target="_blank" rel="noopener" data-wa data-pop data-svc-ar="{ar}" data-svc-en="{en}">{HEART}{HEARTPOP}<span data-ar="احجز عبر واتساب" data-en="Book on WhatsApp">احجز عبر واتساب</span></a>
      </article>
'''
def series(i, id_, ar, en, dar, den, chips):
    ch = ''.join('<span class="dc-chip %s" data-ar="%s" data-en="%s">%s</span>' % (c, a, e, a) for a, e, c in chips)
    return f'''      <article class="dc-service dc-svc-card dc-svc-card--series" data-rv data-grp="series" style="--i:{i % 3}" id="ws-{id_}">
        {art(id_)}<div class="dc-svc-titlebox"><div class="dc-svc-chips">{ch}</div><h3 class="dc-service__title" data-ar="{ar}" data-en="{en}">{ar}</h3></div>
        <p class="dc-service__desc" data-ar="{dar}" data-en="{den}">{dar}</p>
        <dl class="dc-service__facts dc-service__facts--2">
          <div><dt data-ar="اللقاءات" data-en="Meetings">اللقاءات</dt><dd data-ar="3 أو أكثر" data-en="3 or more">3 أو أكثر</dd></div>
          <div><dt data-ar="السعر" data-en="Price">السعر</dt><dd data-ar="للسلسلة كاملة" data-en="Per series">للسلسلة كاملة</dd></div>
        </dl>
        <a class="dc-btn dc-btn--cta" href="{wa(ar)}" target="_blank" rel="noopener" data-wa data-pop data-svc-ar="{ar}" data-svc-en="{en}">{HEART}{HEARTPOP}<span data-ar="اسألوا عن السعر" data-en="Ask for a quote">اسألوا عن السعر</span></a>
      </article>
'''
cards = ''.join(card(i, w) for i, w in enumerate(W))
cards += series(6, 'imagination', 'سلسلة الخيال', 'The Imagination Series',
  'سلسلة ورشات للأطفال. يُحسب السعر للسلسلة كاملة حسب مدتها وعدد المشاركين.',
  'A workshop series for children. Priced for the whole series, by its length and the number of participants.',
  [('أطفال','Children','dc-chip--pink')])
cards += series(7, 'between', 'سلسلة بيني وبين نفسي', 'The Between Me and Myself Series',
  'سلسلة ورشات للنساء. يُحسب السعر للسلسلة كاملة حسب مدتها وعدد المشاركات.',
  'A workshop series for women. Priced for the whole series, by its length and the number of participants.',
  [('نساء','Women','dc-chip--pink')])
src = open(os.path.join(HERE, 'services.src.html'), encoding='utf-8').read()
src = src.replace('%%CARDS%%', cards)
for k, ar in (('SESSIONS', 'الجلسات'), ('GAMES', 'ليالي الألعاب'), ('GENERAL', 'خدمات دردشات')):
    src = src.replace('%%WA_' + k + '%%', wa(ar) if k != 'GENERAL' else 'https://wa.me/972543992424?text=' + urllib.parse.quote('مرحبًا دردشات، عندي سؤال عن خدماتكم'))
open(os.path.join(OUT, 'services.html'), 'w', encoding='utf-8').write(src)
print('ok', len(src))
