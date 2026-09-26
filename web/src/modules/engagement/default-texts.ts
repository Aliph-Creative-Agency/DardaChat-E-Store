/**
 * Built-in default texts for transactional notifications, real Arabic + English.
 * STUB(contracts): the engagement team moves these into approved `message_templates` (WhatsApp templates need Meta
 * approval) and renders from there; these stay as the fallback when no active template exists.
 */
import { agorot, formatMoney } from "../../lib/money";
import type { Locale, NotifyData, TransactionalEvent } from "./types";

interface Rendered {
  text: string;
  subject: string;
}

type Renderer = (d: Required<Pick<NotifyData, "name" | "reference" | "url">> & { total: string; data: NotifyData }) => Rendered;

const AR: Record<TransactionalEvent, Renderer> = {
  "order.confirmation": ({ name, reference, total, url }) => ({
    subject: `تأكيد طلبك ${reference}`,
    text: `أهلاً ${name}، شكراً لطلبك من دردشة! رقم طلبك ${reference} والمجموع ${total}. سنبلغك عندما يخرج طلبك للتوصيل.${url ? ` تابع طلبك: ${url}` : ""}`,
  }),
  "payment.succeeded": ({ name, reference, total }) => ({
    subject: `تم استلام الدفعة للطلب ${reference}`,
    text: `أهلاً ${name}، وصلتنا دفعتك بقيمة ${total} للطلب ${reference}. شكراً لك!`,
  }),
  "payment.failed": ({ name, reference, url }) => ({
    subject: `لم تكتمل الدفعة للطلب ${reference}`,
    text: `أهلاً ${name}، لم تكتمل عملية الدفع للطلب ${reference}. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.${url ? ` ${url}` : ""}`,
  }),
  "order.dispatched": ({ name, reference, url }) => ({
    subject: `طلبك ${reference} في الطريق إليك`,
    text: `أهلاً ${name}، طلبك ${reference} خرج للتوصيل وهو في الطريق إليك.${url ? ` تابع طلبك: ${url}` : ""}`,
  }),
  "order.delivered": ({ name, reference }) => ({
    subject: `تم توصيل طلبك ${reference}`,
    text: `أهلاً ${name}، تم توصيل طلبك ${reference}. نتمنى لكم جلسات دردشة ممتعة!`,
  }),
  "account.welcome": ({ name }) => ({
    subject: "أهلاً بك في دردشة",
    text: `أهلاً ${name}، تم إنشاء حسابك في دردشة بنجاح. يسعدنا انضمامك إلينا!`,
  }),
  "account.password_reset": ({ data }) => ({
    subject: "إعادة تعيين كلمة المرور",
    text: `وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في دردشة. استخدم هذا الرابط خلال ساعة: ${data.resetUrl ?? ""} — إذا لم تطلب ذلك فتجاهل هذه الرسالة.`,
  }),
  "account.email_changed": ({ data }) => ({
    subject: "تم تغيير بريدك الإلكتروني",
    text: `تم تغيير البريد الإلكتروني لحسابك في دردشة${data.newEmail ? ` إلى ${data.newEmail}` : ""}. إذا لم تقم بهذا التغيير فتواصل معنا فوراً.`,
  }),
};

const EN: Record<TransactionalEvent, Renderer> = {
  "order.confirmation": ({ name, reference, total, url }) => ({
    subject: `Your order ${reference} is confirmed`,
    text: `Hi ${name}, thank you for your DardaChat order! Your order number is ${reference} and the total is ${total}. We'll let you know when it's out for delivery.${url ? ` Track it: ${url}` : ""}`,
  }),
  "payment.succeeded": ({ name, reference, total }) => ({
    subject: `Payment received for order ${reference}`,
    text: `Hi ${name}, we've received your payment of ${total} for order ${reference}. Thank you!`,
  }),
  "payment.failed": ({ name, reference, url }) => ({
    subject: `Payment for order ${reference} did not go through`,
    text: `Hi ${name}, the payment for order ${reference} did not go through. You can try again or choose another payment method.${url ? ` ${url}` : ""}`,
  }),
  "order.dispatched": ({ name, reference, url }) => ({
    subject: `Your order ${reference} is on its way`,
    text: `Hi ${name}, your order ${reference} is out for delivery.${url ? ` Track it: ${url}` : ""}`,
  }),
  "order.delivered": ({ name, reference }) => ({
    subject: `Your order ${reference} has been delivered`,
    text: `Hi ${name}, your order ${reference} has been delivered. Enjoy your conversations!`,
  }),
  "account.welcome": ({ name }) => ({
    subject: "Welcome to DardaChat",
    text: `Hi ${name}, your DardaChat account is ready. We're glad to have you!`,
  }),
  "account.password_reset": ({ data }) => ({
    subject: "Reset your password",
    text: `We received a request to reset the password of your DardaChat account. Use this link within one hour: ${data.resetUrl ?? ""} — if you didn't ask for this, ignore this message.`,
  }),
  "account.email_changed": ({ data }) => ({
    subject: "Your email address was changed",
    text: `The email address of your DardaChat account was changed${data.newEmail ? ` to ${data.newEmail}` : ""}. If you didn't make this change, contact us right away.`,
  }),
};

const FALLBACK_NAME: Record<Locale, string> = { ar: "عزيزنا العميل", en: "there" };

export function renderDefaultText(event: TransactionalEvent, locale: Locale, data: NotifyData, customerName?: string | null): Rendered {
  const name = (typeof data.name === "string" && data.name.trim()) || customerName?.trim() || FALLBACK_NAME[locale];
  const total = typeof data.total === "number" ? formatMoney(agorot(data.total), locale) : "";
  const renderer = (locale === "ar" ? AR : EN)[event];
  return renderer({ name, reference: data.reference ?? "", url: data.url ?? "", total, data });
}
