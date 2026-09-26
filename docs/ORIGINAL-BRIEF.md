# DardChat — the original brief

This is the client's request **as received, verbatim**, before any interpretation. Everything
else in `docs/` derives from it. It is kept unaltered so that any later document can be checked
against what was actually asked for.

Received 24 August 2026, via Obaida, from the client's own notes. Two parts: an English list
of deliverables and an Arabic list of goals for the site. Client profile:
https://www.instagram.com/dard_chat

---

## Part A — English deliverables (verbatim)

> Design and develop a responsive, interactive website with a customized UI/UX experience.
>
> Develop a personality test interactive game where the character of the user goes through
> literal manifestations (done in 3d in the form of a journey) of certain continuous scenarios
> and at the end a psychological explanation is given to the choices the user have made (if
> we'd ultimately simplify this its just a multi stage choices game that has interactive
> elements ).
>
> Develop a complete e-commerce store with product management, shopping cart, checkout,
> inventory, orders, and customer management.
>
> Build a centralized database with sales, purchasing, inventory tracking, analytics, reports,
> and an admin dashboard.
>
> Include database integration, user accounts, admin dashboard, and future scalability.
>
> Integrate an AI Assistant to support customers, answer questions, and guide users through
> products and services.

## Part B — Arabic goals for the site (verbatim)

> أولًا: تطوير موقع DardChat
>
> نحتاج إلى فهم أوسع لإمكانيات الموقع وما يمكن تنفيذه من خلاله، بحيث لا يكون الموقع مجرد
> منصة تعريفية، وإنما *موقع تفاعلي متكامل* يخدم DardChat من عدة جوانب:
>
> * التعريف بـ DardChat والألعاب والمنتجات.
> * عرض الألعاب بطريقة تفاعلية وجذابة.
> * إتاحة *الشراء مباشرة من الموقع*.
> * حفظ بيانات العملاء وتنظيمها.
> * متابعة العملاء وسلوكهم وعمليات الشراء.
> * إرسال الإشعارات والعروض والإعلانات للعملاء بشكل مستمر.
> * إمكانية وجود *مساعد بالذكاء الاصطناعي* داخل الموقع لمساعدة الزبائن والإجابة عن استفساراتهم
>   واقتراح الألعاب المناسبة لهم.
> * تطوير *لعبة أو تجربة رقمية شخصية* مرتبطة بالعلامة التجارية، بحيث تكون جزءًا من تجربة
>   المستخدم على الموقع.

---

## Where each ask landed

| Original ask | SRS section | Notes |
|---|---|---|
| Responsive, interactive website, custom UI/UX | §3.1, §6.5, §6.6 | Bilingual Arabic/English with full RTL became a hard requirement once the market was known |
| Personality test game — 3D journey, multi-stage choices, psychological explanation at the end | **§4.15** | Kept exactly as briefed: multi-stage → 3D → single outcome → written psychological interpretation. Whether the result *recommends a product* was **my addition**, not the client's, and is now deferred to a client decision (OI-21) |
| E-commerce store: products, cart, checkout, inventory, orders, customers | §4.1–4.3, §4.5–4.8, §4.10 | |
| Centralised database: sales, purchasing, inventory, analytics, reports, admin dashboard | §4.8, §4.9, §4.12, §5 | Purchasing survived a proposed trim because two of five titles are seasonal and lead time matters |
| User accounts, admin dashboard, future scalability | §4.7, §2.7, §6.7 | Back office reduced to two roles once team size was known |
| AI assistant — support, answer questions, guide through products | §4.14 | Model fixed as Google Gemini 2.5 Flash at v0.6 |
| التعريف بـ DardChat والألعاب | §4.1, §4.16 | |
| عرض الألعاب بطريقة تفاعلية | §4.1, §4.2 | |
| الشراء مباشرة من الموقع | §4.3, §4.4, §4.5 | §4.4 remains a blocking placeholder — no merchant account exists yet |
| حفظ بيانات العملاء وتنظيمها | §4.7, §4.10, §5 | |
| متابعة العملاء وسلوكهم وعمليات الشراء | §4.10, §4.12 | |
| إرسال الإشعارات والعروض والإعلانات بشكل مستمر | §4.11 | WhatsApp-first; web push demoted once iOS reach was understood |
| مساعد بالذكاء الاصطناعي … واقتراح الألعاب المناسبة | §4.14 | The "suggest suitable games" clause is FR-AI-006's recommendation tool |
| لعبة أو تجربة رقمية شخصية مرتبطة بالعلامة التجارية | §4.15 | Same as the English Journey ask |

## What the brief did not say

These shaped the specification heavily and came from later discovery, not from the brief.
They are recorded so nobody mistakes them for client requirements:

- **The market, currency, courier, payment rails, tax obligations and dispatch model** — all
  from the client questionnaire, applied at v0.5. See `HANDOFF.md` §2.
- **What the products actually are** — boxed conversation games with cards and props, five
  titles, two seasonal — from the client's Instagram, applied at v0.7.
- **The size of the audience and the team** — which drove the concurrency and role cuts at
  v0.7.
- **That the Journey should feed the store** — my framing, not theirs. Deferred at v0.7.

For the *current* business understanding, read `REVIEW-BRIEF.md` (one page) or
`HANDOFF.md` §2 (the confirmed facts table). This file is the starting point; those are
where it ended up.
