import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";

const COPY = {
  ar: { title: "دردشة", body: "النموذج الأولي قيد الإنشاء." },
  en: { title: "DardaChat", body: "The prototype is under construction." },
} as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = COPY[locale];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold">{copy.title}</h1>
      <p>{copy.body}</p>
    </main>
  );
}
