/**
 * Builds the DardChat client questionnaire as a Google Form.
 *
 * HOW TO RUN
 *   1. Go to script.google.com  ->  New project
 *   2. Delete whatever is in the editor, paste this whole file in
 *   3. Press Run. Approve the permission prompt the first time.
 *   4. Open View > Logs (or Execution log). It prints two links:
 *        EDIT link  - for you
 *        SHARE link - send this one to the client
 *
 * Bilingual: Arabic is the question, English sits underneath as help text.
 * The Journey section is intentionally excluded.
 */

function createDardChatForm() {
  var form = FormApp.create('DardChat — أسئلة المشروع / Project Questions');

  form.setTitle('DardChat — أسئلة المشروع');
  form.setDescription(
    'اتخذنا نيابةً عنكم كل قرار يمكننا اتخاذه. هذه الأسئلة لا يستطيع الإجابة عنها أحد غيركم.\n' +
    'إن لم تكونوا متأكدين من إجابة، اختاروا "غير متأكدين" ونحن نتولّى الأمر.\n\n' +
    'مؤكَّد مسبقًا ولا حاجة لأي إجراء: فلسطين عند الإطلاق · الأسعار بالشيكل مع عرض الدولار · ' +
    'لديكم نقاط بيع فعلية · تبيعون في الفعاليات · الدفع عند الاستلام: نعم\n\n' +
    '— — —\n' +
    'We have made every decision we can on your behalf. These are the ones only you can answer. ' +
    'If you are not sure, pick "not sure" and we will handle it.'
  );

  form.setProgressBar(true);
  form.setConfirmationMessage('شكرًا لكم. سنراجع الإجابات ونعود إليكم.\nThank you — we will review your answers and come back to you.');

  // ---------- helpers ----------
  function section(title, help) {
    var p = form.addPageBreakItem().setTitle(title);
    if (help) p.setHelpText(help);
    return p;
  }
  function choice(title, help, options, required) {
    var q = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options);
    if (help) q.setHelpText(help);
    q.setRequired(required !== false);
    return q;
  }
  function text(title, help) {
    var q = form.addTextItem().setTitle(title);
    if (help) q.setHelpText(help);
    q.setRequired(false);
    return q;
  }

  // ================= 1. Payments =================
  section('١. المدفوعات / Payments',
          'نرجو الإجابة عن هذا القسم أولًا — بناء صفحة الدفع يعتمد عليه، وإجراءات الاعتماد تستغرق من أسبوعين إلى أربعة.\n' +
          'Please answer this section first. Checkout architecture depends on it, and provider approval takes 2–4 weeks.');

  choice('كيف تستقبلون مدفوعات البطاقات حاليًا؟ / How do you currently take card payments?',
         'مزوّدو الدفع العالميون غير متاحين للتجار في فلسطين، فالخيارات محلية.\n' +
         'The international providers most stores use are not available to Palestinian merchants, so the options are local.',
         [
           'لدينا حساب تاجر إلكتروني / We already have an e-commerce merchant account',
           'لدينا حساب بنكي تجاري بلا نظام دفع إلكتروني / Business bank account, no online payment setup yet',
           'لا يوجد لدينا شيء — نرجو التوصية / Nothing set up — please recommend',
           'نفضّل البدء بالدفع عند الاستلام والحوالة البنكية فقط / Start with cash on delivery and bank transfer only'
         ]);

  text('إن وُجد، ما اسم مزوّد الدفع أو البنك؟ / If you have one, which provider or bank?',
       'اتركوه فارغًا إن لم يوجد. / Leave blank if not applicable.');

  // ================= 2. Tax and invoicing =================
  section('٢. الضريبة والفوترة / Tax and invoicing',
          'نرجو التأكد مع محاسبكم بدل التخمين — للفوترة الإلكترونية أثر حقيقي على نطاق العمل.\n' +
          'Please check with your accountant rather than guessing. E-invoicing materially changes scope.');

  choice('هل DardChat مسجّلة في ضريبة القيمة المضافة؟ / Is DardChat registered for VAT?', null,
         ['نعم / Yes', 'لا / No', 'غير متأكدين — سنسأل محاسبنا / Not sure — we will ask our accountant']);

  choice('هل أنتم ملزمون بتقديم فواتير إلكترونية لدائرة الضريبة؟ / Are you required to submit electronic invoices to the tax authority?',
         null,
         ['نعم / Yes', 'لا / No', 'غير متأكدين — سنسأل محاسبنا / Not sure — we will ask our accountant']);

  // ================= 3. Delivery =================
  section('٣. التوصيل / Delivery', null);

  choice('من يوصّل طلباتكم؟ / Who delivers your orders?', null,
         [
           'نستخدم شركة شحن / We use a delivery company',
           'نوصّل بأنفسنا / We deliver ourselves',
           'لم نقرر بعد — نرجو التوصية / Not decided yet — please recommend'
         ]);

  text('ما اسم شركة الشحن؟ / Which delivery company?',
       'اتركوه فارغًا إن لم تقرروا بعد. / Leave blank if not decided.');

  choice('هل يوفّرون أرقام تتبّع يمكن تمريرها للعملاء؟ / Do they provide tracking numbers you can pass to customers?',
         null, ['نعم / Yes', 'لا / No', 'غير متأكدين / Not sure']);

  choice('من أين تُشحن الطلبات؟ / Where do orders ship from?', null,
         [
           'موقع واحد / One location',
           'أكثر من موقع / More than one location',
           'من محلاتنا / From our shops'
         ]);

  text('إن كان أكثر من موقع، ما هي؟ / If more than one, which locations?');

  // ================= 4. Points of sale =================
  section('٤. نقاط البيع / Your points of sale',
          'إجاباتكم هنا تحدد كيف نمنع بيع علبة على الموقع بعد بيعها في محل أو فعالية.\n' +
          'Your answers here determine how we stop the website selling a box that was just sold in a shop or at an event.');

  choice('المحلات التي تبيع DardChat هي: / The shops selling DardChat are:', null,
         [
           'محلاتنا نحن / Our own shops',
           'محلات أخرى تعرض منتجاتنا / Other people’s shops that stock us',
           'الاثنان معًا / Both'
         ]);

  choice('هل المخزون في المحلات هو نفسه الذي سيبيع منه الموقع؟ / Is the stock in the shops the same stock the website would sell from?',
         null,
         [
           'نعم — مخزون مشترك واحد / Yes — one shared pool',
           'لا — سنخصص كمية منفصلة للموقع / No — a separate quantity reserved for online',
           'غير متأكدين / Not sure'
         ]);

  // ================= 5. Products =================
  section('٥. المنتجات / Products',
          'مع احتساب كل إصدار وكل حجم على حدة. / Count each edition and size separately.');

  choice('كم منتجًا سيكون على الموقع عند الإطلاق؟ / How many products at launch?', null,
         ['١–١٠ / 1–10', '١١–٢٥ / 11–25', '٢٦–٥٠ / 26–50', 'أكثر من ٥٠ / More than 50']);

  choice('وبعد سنتين تقريبًا؟ / And in about two years?', null,
         ['أقل من ٢٥ / Under 25', '٢٥–٥٠ / 25–50', '٥٠–١٠٠ / 50–100', 'أكثر من ١٠٠ / More than 100']);

  // ================= 6. WhatsApp and email =================
  section('٦. الواتساب والبريد / WhatsApp and email', null);

  choice('هل لديكم حساب WhatsApp Business رسمي موثّق؟ / Do you have an official verified WhatsApp Business account?',
         'ليس تطبيق واتساب الأعمال المجاني، بل الحساب الموثّق عبر Meta.\n' +
         'Not the free WhatsApp Business app — the verified one through Meta.',
         [
           'نعم / Yes',
           'نستخدم التطبيق المجاني فقط / We only use the free Business app',
           'لا يوجد / Neither',
           'غير متأكدين / Not sure'
         ]);

  choice('هل تستخدمون أداة بريد إلكتروني أو تسويق ترغبون بالاستمرار عليها؟ / Any email or marketing tool you want to keep?',
         null, ['نعم / Yes', 'لا / No']);

  text('إن كان نعم، ما هي؟ / If yes, which one?');

  // ================= 7. Practical =================
  section('٧. أمور عملية / Practical', null);

  form.addTextItem()
      .setTitle('من يعتمد القرارات ويوقّع على التسليمات؟ / Who approves decisions and signs off work?')
      .setHelpText('اسم شخص واحد. / One person’s name.')
      .setRequired(true);

  choice('هل هناك تاريخ يجب الإطلاق قبله؟ / Is there a date you need to launch by?', null,
         [
           'تاريخ محدد / A fixed date',
           'موسم أو مناسبة / A season or occasion',
           'مرن / Flexible'
         ]);

  text('إن وُجد، حدّدوه / If so, please specify');

  choice('ما نطاق الميزانية الذي تعملون ضمنه؟ / What budget range are you working with?',
         'بالدولار الأمريكي. / In US dollars.',
         [
           'أقل من ١٥٬٠٠٠ / Under $15,000',
           '١٥٬٠٠٠ – ٣٠٬٠٠٠ / $15,000 – 30,000',
           '٣٠٬٠٠٠ – ٥٠٬٠٠٠ / $30,000 – 50,000',
           'أكثر من ٥٠٬٠٠٠ / Above $50,000',
           'نفضّل مناقشتها / Prefer to discuss'
         ]);

  form.addParagraphTextItem()
      .setTitle('أي شيء آخر تودّون إخبارنا به؟ / Anything else you want to tell us?')
      .setRequired(false);

  // ---------- output ----------
  Logger.log('EDIT  (keep this):  ' + form.getEditUrl());
  Logger.log('SHARE (send this):  ' + form.getPublishedUrl());
  return form.getPublishedUrl();
}
