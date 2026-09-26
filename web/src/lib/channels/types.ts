/** Outbound message channels (CI-003). Real providers (Meta WhatsApp, SMS gateway, SMTP) plug in behind this. */
export const CHANNELS = ["whatsapp", "sms", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ChannelSendInput {
  /** E.164 phone for whatsapp/sms, email address for email. */
  to: string;
  text: string;
  subject?: string;
  locale: "ar" | "en";
}

export interface ChannelAdapter {
  channel: Channel;
  /** Throws `PermanentError` for an invalid address, `TransientError` for provider hiccups. */
  send(input: ChannelSendInput, signal: AbortSignal): Promise<{ providerRef: string }>;
}
