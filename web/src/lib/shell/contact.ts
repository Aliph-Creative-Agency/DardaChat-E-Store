/**
 * Dardachat's public contact details (DESIGN.md §1, client-supplied). One source for the footer, the contact page,
 * message templates and the assistant's escalation number. Display strings for the address and labels live in
 * the common messages (`footer.*`); the values below are language-neutral.
 */
export const BRAND_CONTACT = {
  /** Shown as typed by the client (always wrap in an LTR isolate inside Arabic text). */
  phoneDisplay: "054-399-2424",
  phoneE164: "+972543992424",
  /** wa.me wants digits only, no plus. */
  whatsappNumber: "972543992424",
  email: "dardchat.2023@gmail.com",
  instagramHandle: "@dard_chat",
  instagramUrl: "https://instagram.com/dard_chat",
} as const;

/** `tel:` link for the brand phone. */
export const BRAND_TEL_HREF = `tel:${BRAND_CONTACT.phoneE164}`;

/** `mailto:` link for the brand email. */
export const BRAND_MAILTO_HREF = `mailto:${BRAND_CONTACT.email}`;

/** WhatsApp deep link, optionally with a prefilled (url-encoded here) message, e.g. "book <service>". */
export function whatsappUrl(text?: string): string {
  const base = `https://wa.me/${BRAND_CONTACT.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
