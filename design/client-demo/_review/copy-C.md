# copy-C: journey.html, assistant.html, index.html

Wording only. Arabic `data-ar` and initial text were changed together. Prices, counts, ids, links and markup are untouched.
Checked: no JS syntax errors; no page errors and no horizontal overflow at 390 and 1440 in ar and en; Journey played through 5 stops; assistant chip answer works.

| Page | Before (ar) | After (ar) |
|---|---|---|
| journey | قعدة على طاولة الدردشة، وخمس لحظات. بتختار شو بتعمل بكل محطة… | جلسة على طاولة «دردشات» في خمس محطات. اختر ما تفعله في كل محطة… |
| journey | بتشوف نتيجتك بدون ما تكتب… / مش تقييم نفسي ولا طبي | ترى نتيجتك دون أن تكتب… / وليست تقييمًا نفسيًا أو طبيًا |
| journey | ما رح نشغّل أي صوت إلا إذا قررت إنت | لن نشغّل أي صوت ما لم تقرر ذلك |
| journey | هاي بطاقة صاحبك / ارجع من الأول / مش هلأ | هذه بطاقة صديقك / ابدأ من جديد / ليس الآن |
| journey | consent, 3D fallback, toasts (رح، بيدعم، بتقدر، وين ما بدك) | MSA (سـ، لا يدعم، يمكنك، حيث تشاء) |
| journey | result bodies/lines/boxText (بتلاحظ مين ساكت…) | MSA (تلاحظ من يلتزم الصمت…); جسر الحكي → جسر الحوار |
| journey | CTA شوف صندوق X / وبرّا رمضان | اطّلع على صندوق X / خارج رمضان |
| journey | nav «الصناديق / The boxes» | «الألعاب / Games» (matches the other pages) |
| assistant | answers: بيجمع العيلة، فيه، بتلعبوا، بتطلعوا منه بذكرى، بيتغيّر | MSA: يجمع العائلة، يحتوي على، تلعب الفرق، ينتهي بذكرى تحتفظون بها، يختلف… ويوجد مرونة |
| assistant | gift answer | للأزواج والشركاء… تقوية العلاقة العاطفية وتجديد المشاعر |
| assistant | sessions answer | حوارية جماعية تعتمد على بطاقات أسئلة «دردشات» |
| assistant | fallback / notice / greeting (بحب أخمّن، بجاوب، أهلًا فيك…) | ليس لدي جواب مؤكد… ولا أفضّل التخمين / أجيب من صفحات الموقع… / أهلًا بك في «دردشات»… |
| assistant | WhatsApp prefill: مرحبا دردشات، بدي أحجز X | مرحبًا دردشات، أرغب في حجز X |
| assistant | chips: شو في داخل الصندوق؟ / شو بتنصحوا لقعدة أصدقاء؟ / كم بياخد التوصيل؟ | ما محتويات الصندوق؟ / ماذا تنصحون لجمعة الأصدقاء؟ / كم يستغرق التوصيل؟ |
| assistant | تحدّث مع الفريق على واتساب / شوف الصندوق / أضف للسلة | تواصل مع الفريق على واتساب / عرض الصندوق / أضف إلى السلة |
| index | hero: متجر دردشات، قبل ما ينبني; ...تقدر تضغط... بتقدر تبدّل... | متجر «دردشات» قبل اكتماله; ...يمكنك الضغط... تستطيع تبديل... |
| index | all card descriptions and signature lines (بتنرسم، بيميل، شو في جوّا الصندوق) | MSA (ترتسم، يميل، محتويات الصندوق); «الصناديق الأربعة» → «صناديق الألعاب الأربعة» |
| index | notes: ما في أسعار ولا صور من العميل لسّا / بدنا نسخة SVG | لم يزوّدنا العميل بالأسعار أو الصور بعد / ونحتاج إلى نسخة SVG |

English: mainly the Journey lede, the Index "Still placeholder" notes, the sessions/workshop answers (added "there is flexibility") and nav "Games". All stay faithful and calm, and the brand is spelled Dardachat.

Deliberately left alone
- Journey in-game cards (the `q` and `c` arrays in SCENES): colloquial, as VOICE.md allows for game prompts. Their English is unchanged.
- The `re:` regexes and the OOS regex in assistant.html: kept colloquial and Arabic/English triggers so user input still matches.
- The «احجز عبر واتساب / Book on WhatsApp» CTA (fixed), `QUOTES` (client verbatim), the English-side toggles ليلي / English / حركة أقل (shared bar, `_shared.js`), and the assistant header nav (platform lane).
- Journey result names (قلب الطاولة, صاحب السؤال, etc.): invented game names with no colloquial wording, kept.
