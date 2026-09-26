import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { BUSINESS_TZ } from "@/lib/time";
import { MESSAGE_NAMESPACES } from "./namespaces";
import { routing, type Locale } from "./routing";

type Messages = Record<string, unknown>;

async function loadNamespace(locale: Locale, namespace: string): Promise<Messages> {
  try {
    return (await import(`../../../messages/${locale}/${namespace}.json`)).default as Messages;
  } catch {
    return {}; // namespace file not created yet
  }
}

export async function loadMessages(locale: Locale): Promise<Record<string, Messages>> {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const),
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: BUSINESS_TZ,
  };
});
