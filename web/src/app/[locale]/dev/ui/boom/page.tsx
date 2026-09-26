import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Dev-only route that throws, to exercise `[locale]/error.tsx`. It renders normally once the `dc_boom=off` cookie
 * is set, so "try again" can be shown to re-fetch and recover.
 */
export default async function BoomPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const jar = await cookies();
  if (jar.get("dc_boom")?.value !== "off") throw new Error("Deliberate dev error (dev/ui/boom)");
  const t = await getTranslations("common.devUi.boom");
  return (
    <main id="main" className="mx-auto max-w-page px-4 py-16">
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <p data-testid="boom-recovered">{t("recovered")}</p>
    </main>
  );
}
