import { eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { settings } from "../core/schema";
import { sendMessage } from "../core";
import { AppError } from "../../lib/errors";
import { TTL } from "./config";
import type { Locale } from "./guards";

/**
 * OTP delivery (FR-ACC-003, AS-18). Auth decides the channel; the port only sends.
 * Policy: phone → WhatsApp first; SMS when WhatsApp is disabled (`auth.otp_whatsapp_enabled`) or the WhatsApp send
 * throws. Email → email.
 */

export type OtpChannel = "whatsapp" | "sms" | "email";
export type OtpPurpose = "login" | "verify_phone" | "verify_email" | "data_request" | "password_reset";

export interface OtpMessage {
  channel: OtpChannel;
  to: string;
  locale: Locale;
  code: string;
  purpose: OtpPurpose;
}

export interface OtpDelivery {
  send(message: OtpMessage): Promise<void>;
}

export const OTP_WHATSAPP_SETTING = "auth.otp_whatsapp_enabled";

export async function isWhatsappOtpEnabled(db: DbOrTx): Promise<boolean> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, OTP_WHATSAPP_SETTING));
  return row?.value !== false && row?.value !== "false";
}

/** Delivers via the policy above and returns the channel that accepted the message. */
export async function deliverOtp(
  db: DbOrTx,
  port: OtpDelivery,
  msg: Omit<OtpMessage, "channel"> & { kind: "phone" | "email" },
): Promise<OtpChannel> {
  const { kind, ...rest } = msg;
  if (kind === "email") {
    await port.send({ ...rest, channel: "email" });
    return "email";
  }
  if (await isWhatsappOtpEnabled(db)) {
    try {
      await port.send({ ...rest, channel: "whatsapp" });
      return "whatsapp";
    } catch {
      // fall through to SMS (the failure itself is the adapter's to report)
    }
  }
  await port.send({ ...rest, channel: "sms" });
  return "sms";
}

const MINUTES = Math.round(TTL.otpMs / 60_000);

/** Bilingual OTP copy (Latin digits in both locales so the code is copyable). */
export function otpText(locale: Locale, code: string): string {
  return locale === "en"
    ? `Your Dardachat code is ${code}. It expires in ${MINUTES} minutes. Never share it with anyone.`
    : `رمز التحقق الخاص بك في دردشات هو ${code}. صالح لمدة ${MINUTES} دقائق. لا تشاركه مع أي شخص.`;
}

/**
 * OTP port bound to core messaging (`sendMessage`, event `auth.otp`): one channel per call so `deliverOtp` keeps the
 * WhatsApp -> SMS policy. A send that ends `failed` throws, which makes `deliverOtp` fall back to SMS.
 */
export function outboxOtpDelivery(db: DbOrTx): OtpDelivery {
  return {
    async send(m) {
      const result = await sendMessage(
        {
          channels: [m.channel],
          to: m.channel === "email" ? { email: m.to } : { phone: m.to },
          eventKey: "auth.otp",
          locale: m.locale,
          text: otpText(m.locale, m.code),
          payload: { code: m.code, purpose: m.purpose },
        },
        { db },
      );
      if (result.status === "failed") {
        throw new AppError("unavailable", `otp ${m.channel} delivery failed`, { messageId: result.messageId });
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Password-reset link (FR-ACC-006): email only.
// ---------------------------------------------------------------------------------------------------------------

export interface ResetLinkMessage {
  to: string;
  locale: Locale;
  url: string;
  subjectType: "customer" | "staff";
}

export interface ResetLinkDelivery {
  sendResetLink(message: ResetLinkMessage): Promise<void>;
}

const RESET_MINUTES = Math.round(TTL.resetTokenMs / 60_000);

export function resetLinkText(locale: Locale, url: string): { subject: string; text: string } {
  return locale === "en"
    ? {
        subject: "Reset your Dardachat password",
        text: `Use this link to choose a new password: ${url}\nIt works once and expires in ${RESET_MINUTES} minutes. If you did not ask for this, ignore this email.`,
      }
    : {
        subject: "إعادة تعيين كلمة المرور في دردشات",
        text: `استخدم هذا الرابط لاختيار كلمة مرور جديدة: ${url}\nيعمل الرابط مرة واحدة وتنتهي صلاحيته بعد ${RESET_MINUTES} دقيقة. إذا لم تطلب ذلك فتجاهل هذه الرسالة.`,
      };
}

/** Reset-link port bound to core messaging (`sendMessage`, email, event `auth.password_reset`). */
export function outboxResetLinkDelivery(db: DbOrTx): ResetLinkDelivery {
  return {
    async sendResetLink(m) {
      const { subject, text } = resetLinkText(m.locale, m.url);
      await sendMessage(
        {
          channels: ["email"],
          to: { email: m.to },
          eventKey: "auth.password_reset",
          locale: m.locale,
          subject,
          text,
          payload: { url: m.url, subjectType: m.subjectType },
        },
        { db },
      );
    },
  };
}
