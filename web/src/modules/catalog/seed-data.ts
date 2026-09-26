/**
 * Placeholder catalogue + content (AS-04: five launch titles). Real Arabic/English copy, but the titles, prices and
 * policies are PLACEHOLDERS until the client supplies the real ones (BACKLOG). Money in agorot.
 */

export interface SeedProduct {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  playInstructionsAr: string;
  playInstructionsEn: string;
  group: "family" | "friends" | "couples";
  occasion: "ramadan" | "all_year";
  tags: string[];
  playerMin: number;
  playerMax: number;
  minAge: number;
  durationMin: number;
  variant: { sku: string; price: number; cost: number; weightG: number };
  components: { kind: "question_cards" | "challenge_cards" | "prop" | "board" | "other"; nameAr: string; nameEn: string; count: number | null }[];
  /** Opening stock per location code (inventory seed). */
  openingStock: { STORE: number; HOME: number };
  seasonal?: { startsOn: string; endsOn: string; returnsNoteAr: string; returnsNoteEn: string };
}

// Ramadan 1448 AH is expected around 2027-02-08 .. 2027-03-09; sell from mid-January until just after Eid.
const RAMADAN_1448 = {
  startsOn: "2027-01-15",
  endsOn: "2027-03-12",
  returnsNoteAr: "منتج موسمي: يُقبل الإرجاع خلال ٧ أيام من الاستلام وقبل نهاية الموسم.",
  returnsNoteEn: "Seasonal item: returns accepted within 7 days of delivery and before the season ends.",
};

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    slug: "sahret-ramadan",
    nameAr: "سهرة رمضان",
    nameEn: "Ramadan Nights",
    descriptionAr:
      "لعبة أسئلة عائلية لسهرات ما بعد الإفطار: أسئلة عن الذكريات والعادات والأكلات الرمضانية تجمع الكبار والصغار حول طاولة واحدة.",
    descriptionEn:
      "A family question game for the evenings after iftar: questions about memories, traditions and Ramadan food that bring young and old around one table.",
    playInstructionsAr:
      "اقسموا أنفسكم إلى فريقين. يسحب كل فريق بطاقة ويقرأ السؤال بصوت عالٍ، ومن يجيب بقصة حقيقية يربح البطاقة. يفوز الفريق الذي يجمع ١٠ بطاقات أولاً.",
    playInstructionsEn:
      "Split into two teams. Each team draws a card and reads the question aloud; answer with a true story to win the card. The first team to collect 10 cards wins.",
    group: "family",
    occasion: "ramadan",
    tags: ["عائلة", "رمضان", "أسئلة", "family", "ramadan"],
    playerMin: 3,
    playerMax: 12,
    minAge: 8,
    durationMin: 45,
    variant: { sku: "DC-RMD-001", price: 8900, cost: 3200, weightG: 450 },
    components: [
      { kind: "question_cards", nameAr: "بطاقات أسئلة", nameEn: "Question cards", count: 120 },
      { kind: "prop", nameAr: "ساعة رملية", nameEn: "Sand timer", count: 1 },
      { kind: "other", nameAr: "كتيّب القواعد", nameEn: "Rule booklet", count: 1 },
    ],
    openingStock: { STORE: 20, HOME: 5 },
    seasonal: RAMADAN_1448,
  },
  {
    slug: "fawazeer-el-eileh",
    nameAr: "فوازير العيلة",
    nameEn: "Family Riddles",
    descriptionAr: "ثلاثون فزّورة، واحدة لكل ليلة من ليالي رمضان، مع تلميحات للصغار وجوائز رمزية للفائزين.",
    descriptionEn: "Thirty riddles, one for every night of Ramadan, with hints for the little ones and small prizes for the winners.",
    playInstructionsAr: "افتحوا ظرف الليلة بعد الإفطار واقرأوا الفزّورة. لكل لاعب ثلاث محاولات، ومن يحلّها يأخذ نجمة. صاحب أكثر النجوم في آخر الشهر هو البطل.",
    playInstructionsEn: "Open the night's envelope after iftar and read the riddle. Each player has three guesses; whoever solves it takes a star. Most stars at the end of the month wins.",
    group: "family",
    occasion: "ramadan",
    tags: ["عائلة", "رمضان", "فوازير", "أطفال", "riddles"],
    playerMin: 2,
    playerMax: 10,
    minAge: 6,
    durationMin: 15,
    variant: { sku: "DC-RMD-002", price: 7500, cost: 2600, weightG: 380 },
    components: [
      { kind: "question_cards", nameAr: "ظروف الفوازير", nameEn: "Riddle envelopes", count: 30 },
      { kind: "prop", nameAr: "ملصقات نجوم", nameEn: "Star stickers", count: 60 },
      { kind: "board", nameAr: "لوحة النتائج", nameEn: "Score board", count: 1 },
    ],
    openingStock: { STORE: 15, HOME: 5 },
    seasonal: RAMADAN_1448,
  },
  {
    slug: "jalsat-shabab",
    nameAr: "جلسة صحاب",
    nameEn: "Friends' Hangout",
    descriptionAr: "تحديات سريعة ومواقف مضحكة لجلسات الأصدقاء: قلّد، احكِ، أو ارسم خلال دقيقة واحدة.",
    descriptionEn: "Quick challenges and funny situations for nights with friends: act, tell or draw it in one minute.",
    playInstructionsAr: "يسحب اللاعب بطاقة تحدٍّ وينفّذها خلال دقيقة. إذا نجح يحتفظ بالبطاقة، وإذا فشل يختار له الآخرون تحدياً إضافياً.",
    playInstructionsEn: "Draw a challenge card and complete it within a minute. Succeed and keep the card; fail and the others pick you a bonus challenge.",
    group: "friends",
    occasion: "all_year",
    tags: ["أصدقاء", "تحديات", "ضحك", "friends", "party"],
    playerMin: 3,
    playerMax: 8,
    minAge: 14,
    durationMin: 30,
    variant: { sku: "DC-FRN-001", price: 6900, cost: 2400, weightG: 320 },
    components: [
      { kind: "challenge_cards", nameAr: "بطاقات تحدٍّ", nameEn: "Challenge cards", count: 150 },
      { kind: "prop", nameAr: "ساعة رملية", nameEn: "Sand timer", count: 1 },
    ],
    openingStock: { STORE: 25, HOME: 6 },
  },
  {
    slug: "baynatna",
    nameAr: "بيناتنا",
    nameEn: "Between Us",
    descriptionAr: "بطاقات حوار للأزواج في ثلاثة مستويات، من الأسئلة الخفيفة إلى الأحلام والخطط المشتركة.",
    descriptionEn: "Conversation cards for couples in three levels, from light questions to shared dreams and plans.",
    playInstructionsAr: "ابدأا من المستوى الأول وتبادلا الأسئلة. لا توجد إجابات خاطئة؛ استمعا دون مقاطعة، وانتقلا إلى المستوى التالي متى شئتما.",
    playInstructionsEn: "Start at level one and take turns asking. There are no wrong answers; listen without interrupting and move up a level whenever you like.",
    group: "couples",
    occasion: "all_year",
    tags: ["أزواج", "حوار", "couples", "conversation"],
    playerMin: 2,
    playerMax: 2,
    minAge: 18,
    durationMin: 40,
    variant: { sku: "DC-CPL-001", price: 7900, cost: 2700, weightG: 300 },
    components: [
      { kind: "question_cards", nameAr: "بطاقات حوار", nameEn: "Conversation cards", count: 90 },
      { kind: "other", nameAr: "دليل المستويات", nameEn: "Levels guide", count: 1 },
    ],
    openingStock: { STORE: 18, HOME: 4 },
  },
  {
    slug: "hkayat-sitti",
    nameAr: "حكايات ستّي",
    nameEn: "Grandma's Tales",
    descriptionAr: "لعبة سرد قصص عائلية بلوحة وبطاقات صور مستوحاة من البيت والقرية والحارة، تساعد الأطفال على الحكي والخيال.",
    descriptionEn: "A family storytelling game with a board and picture cards inspired by home, village and neighbourhood life, helping children tell stories and imagine.",
    playInstructionsAr: "رمِ النرد وحرّك قطعتك، ثم اسحب بطاقة صورة وأكمل القصة من حيث توقّف اللاعب السابق. تنتهي الحكاية عندما يصل أحدكم إلى بيت ستّي.",
    playInstructionsEn: "Roll the die and move, then draw a picture card and continue the story where the last player stopped. The tale ends when someone reaches Grandma's house.",
    group: "family",
    occasion: "all_year",
    tags: ["عائلة", "أطفال", "قصص", "family", "kids", "storytelling"],
    playerMin: 2,
    playerMax: 6,
    minAge: 6,
    durationMin: 30,
    variant: { sku: "DC-FAM-001", price: 9900, cost: 3900, weightG: 650 },
    components: [
      { kind: "board", nameAr: "لوحة اللعب", nameEn: "Game board", count: 1 },
      { kind: "question_cards", nameAr: "بطاقات صور", nameEn: "Picture cards", count: 80 },
      { kind: "prop", nameAr: "قطع اللاعبين", nameEn: "Player pieces", count: 6 },
      { kind: "prop", nameAr: "نرد", nameEn: "Die", count: 1 },
    ],
    openingStock: { STORE: 12, HOME: 3 },
  },
];

export const SEED_COLLECTION = {
  slug: "ramadan",
  nameAr: "مجموعة رمضان",
  nameEn: "Ramadan collection",
  descriptionAr: "ألعاب تجمع العائلة في سهرات رمضان.",
  descriptionEn: "Games that gather the family on Ramadan evenings.",
  productSlugs: ["sahret-ramadan", "fawazeer-el-eileh", "hkayat-sitti"],
};

const PLACEHOLDER_AR = "نص مؤقت — سيُستبدل بالنص المعتمد من المتجر.";
const PLACEHOLDER_EN = "Placeholder text — to be replaced by the shop's approved wording.";

export const SEED_POLICIES = [
  {
    kind: "terms",
    titleAr: "الشروط والأحكام",
    titleEn: "Terms and conditions",
    bodyAr: `باستخدامك لمتجر دردشة فإنك توافق على هذه الشروط. الأسعار بالشيكل وتشمل ضريبة القيمة المضافة. ${PLACEHOLDER_AR}`,
    bodyEn: `By using the DardaChat store you agree to these terms. Prices are in shekels and include VAT. ${PLACEHOLDER_EN}`,
  },
  {
    kind: "privacy",
    titleAr: "سياسة الخصوصية",
    titleEn: "Privacy policy",
    bodyAr: `نجمع فقط البيانات اللازمة لتوصيل طلبك والتواصل معك، ولا نشاركها إلا مع شركة التوصيل ومزوّد الدفع. يمكنك طلب نسخة من بياناتك أو حذفها. ${PLACEHOLDER_AR}`,
    bodyEn: `We collect only the data needed to deliver your order and contact you, and share it only with the courier and the payment provider. You can request a copy of your data or its deletion. ${PLACEHOLDER_EN}`,
  },
  {
    kind: "returns",
    titleAr: "سياسة الإرجاع",
    titleEn: "Returns policy",
    bodyAr: `يمكن إرجاع اللعبة غير المفتوحة خلال ١٤ يوماً من الاستلام. للمنتجات الموسمية شروط خاصة تظهر في صفحة المنتج. ${PLACEHOLDER_AR}`,
    bodyEn: `Unopened games can be returned within 14 days of delivery. Seasonal items have special terms shown on their product page. ${PLACEHOLDER_EN}`,
  },
  {
    kind: "delivery",
    titleAr: "سياسة التوصيل",
    titleEn: "Delivery policy",
    bodyAr: `نوصل إلى محافظات الضفة الغربية خلال ١–٣ أيام عمل، ورسوم التوصيل تظهر قبل تأكيد الطلب. الدفع عند الاستلام متاح في معظم المناطق. ${PLACEHOLDER_AR}`,
    bodyEn: `We deliver across the West Bank governorates within 1–3 working days; the delivery fee is shown before you confirm. Cash on delivery is available in most areas. ${PLACEHOLDER_EN}`,
  },
] as const;

export const SEED_FAQ = [
  {
    topic: "delivery",
    questionAr: "كم يستغرق التوصيل؟",
    questionEn: "How long does delivery take?",
    answerAr: "عادةً من يوم إلى ثلاثة أيام عمل داخل الضفة الغربية، وتظهر المدة المتوقعة لمنطقتك عند الدفع.",
    answerEn: "Usually one to three working days within the West Bank; the expected window for your area is shown at checkout.",
  },
  {
    topic: "delivery",
    questionAr: "كم رسوم التوصيل؟",
    questionEn: "How much is delivery?",
    answerAr: "رسوم ثابتة حسب المحافظة، وتظهر في السلة قبل تأكيد الطلب.",
    answerEn: "A flat fee per governorate, shown in your cart before you confirm the order.",
  },
  {
    topic: "payment",
    questionAr: "هل يمكنني الدفع عند الاستلام؟",
    questionEn: "Can I pay cash on delivery?",
    answerAr: "نعم، في معظم المناطق وحتى حدٍّ معيّن لقيمة الطلب. يمكنك أيضاً الدفع بالبطاقة.",
    answerEn: "Yes, in most areas and up to a certain order total. You can also pay by card.",
  },
  {
    topic: "payment",
    questionAr: "هل الأسعار تشمل الضريبة؟",
    questionEn: "Do prices include VAT?",
    answerAr: "نعم، جميع الأسعار بالشيكل وتشمل ضريبة القيمة المضافة.",
    answerEn: "Yes, all prices are in shekels and include VAT.",
  },
  {
    topic: "returns",
    questionAr: "كيف أُرجع لعبة؟",
    questionEn: "How do I return a game?",
    answerAr: "تواصل معنا عبر واتساب خلال ١٤ يوماً من الاستلام مع رقم الطلب، وسنرتّب الاستلام.",
    answerEn: "Message us on WhatsApp within 14 days of delivery with your order number and we will arrange a pickup.",
  },
  {
    topic: "games",
    questionAr: "كيف أختار اللعبة المناسبة؟",
    questionEn: "How do I choose the right game?",
    answerAr: "كل صفحة منتج تذكر عدد اللاعبين والعمر المناسب ومدة اللعب، ويمكنك سؤال المساعد في المتجر.",
    answerEn: "Every product page lists the number of players, suitable age and play time, and you can ask the store assistant.",
  },
  {
    topic: "orders",
    questionAr: "كيف أتابع طلبي؟",
    questionEn: "How do I track my order?",
    answerAr: "استخدم رقم الطلب المرسل إليك في صفحة تتبّع الطلب، أو ادخل إلى حسابك.",
    answerEn: "Use the order number we sent you on the order tracking page, or sign in to your account.",
  },
] as const;

export const SEED_ABOUT_PAGE = {
  slug: "about",
  titleAr: "من نحن",
  titleEn: "About us",
  bodyAr:
    "دردشة متجر فلسطيني صغير يصنع ألعاب الأسئلة والحوار التي تجمع العائلة والأصدقاء. نؤمن بأن أجمل اللحظات تبدأ بسؤال بسيط حول الطاولة.",
  bodyEn:
    "DardaChat is a small Palestinian shop making question and conversation games that bring families and friends together. We believe the best moments start with a simple question around the table.",
};
