import { eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { settings } from "../core/schema";
import { messages } from "../engagement/schema";
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
    ? `Your DardaChat code is ${code}. It expires in ${MINUTES} minutes. Never share it with anyone.`
    : `رمز التحقق الخاص بك في دردشة هو ${code}. صالح لمدة ${MINUTES} دقائق. لا تشاركه مع أي شخص.`;
}

// SHIM(platform-merge): rebind to the core messaging contract
/** Lane shim: writes the OTP into the `messages` outbox (event `auth.otp`); the outbox worker/mock delivers it. */
export function outboxOtpDelivery(db: DbOrTx): OtpDelivery {
  return {
    async send(m) {
      await db.insert(messages).values({
        channel: m.channel,
        to: m.to,
        eventKey: "auth.otp",
        locale: m.locale,
        payload: { code: m.code, purpose: m.purpose, text: otpText(m.locale, m.code) },
      });
    },
  };
}
