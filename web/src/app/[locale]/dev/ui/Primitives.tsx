import { getLocale, getTranslations } from "next-intl/server";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  ICONS,
  IconArrowBack,
  IconArrowForward,
  IconCart,
  IconPlus,
  Input,
  LocaleSwitcher,
  Pagination,
  PriceTag,
  Select,
  Skeleton,
  SkeletonBlock,
  Table,
  Textarea,
  type BadgeTone,
  type TableColumn,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { isLocale } from "@/lib/i18n/routing";
import { agorot, formatMoney, type Agorot } from "@/lib/money";
import { DialogDemo, TabsDemo, ToastDemo } from "./InteractiveDemos";
import { GallerySection } from "./Section";

/** SHL-06 gallery sections: icons, buttons, form fields, cards, badges. Server-rendered. */

const DIRECTIONAL = /Forward|Back|External/;
const BADGE_TONES: BadgeTone[] = ["neutral", "brand", "success", "warning", "danger", "info"];
const SAMPLE_EMAIL = "salma.example.com";

type SampleOrder = { ref: string; n: 1 | 2 | 3; status: "delivered" | "onTheWay" | "failed"; tone: BadgeTone; items: number; total: Agorot; placed: string };
const SAMPLE_ORDERS: SampleOrder[] = [
  { ref: "DC-7K3M-9QPT", n: 1, status: "delivered", tone: "success", items: 2, total: agorot(22000), placed: "2026-09-24T09:15:00Z" },
  { ref: "DC-2HX8-4LRW", n: 2, status: "onTheWay", tone: "info", items: 1, total: agorot(11000), placed: "2026-09-25T17:40:00Z" },
  { ref: "DC-9QPD-3MTA", n: 3, status: "failed", tone: "danger", items: 12, total: agorot(132050), placed: "2026-09-26T21:30:00Z" },
];

export async function PrimitivesGallery() {
  const t = await getTranslations("common.devUi");
  const current = await getLocale();
  const locale = isLocale(current) ? current : "ar";
  const orderColumns: TableColumn<SampleOrder>[] = [
    { id: "ref", header: t("table.ref"), rowHeader: true, cell: (o) => <code dir="ltr" className="font-mono">{o.ref}</code> },
    { id: "customer", header: t("table.customer"), cell: (o) => t(`table.customer${o.n}`) },
    { id: "city", header: t("table.city"), cell: (o) => t(`table.city${o.n}`) },
    { id: "status", header: t("table.status"), cell: (o) => <Badge tone={o.tone}>{t(`table.${o.status}`)}</Badge> },
    { id: "items", header: t("table.items"), numeric: true, cell: (o) => formatNumber(o.items, locale) },
    { id: "total", header: t("table.total"), numeric: true, cell: (o) => formatMoney(o.total, locale) },
    { id: "placed", header: t("table.placed"), numeric: true, cell: (o) => formatDate(o.placed, locale) },
  ];

  return (
    <>
      <GallerySection id="icons" title={t("icons.heading")} note={t("icons.note")}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <li key={name} className="flex items-center gap-3 rounded-control bg-surface px-3 py-3 shadow-card">
              <Icon size={24} className="text-brand" />
              <span className="flex min-w-0 flex-col">
                <code dir="ltr" className="truncate font-mono text-xs">
                  {name.replace(/^Icon/, "")}
                </code>
                {DIRECTIONAL.test(name) ? <span className="text-xs text-ink-soft">{t("icons.directional")}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="buttons" title={t("buttons.heading")} note={t("buttons.note")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("buttons.primary")}</Button>
            <Button variant="cta" iconStart={<IconCart />}>
              {t("buttons.cta")}
            </Button>
            <Button variant="secondary">{t("buttons.secondary")}</Button>
            <Button variant="ghost">{t("buttons.ghost")}</Button>
            <Button variant="danger">{t("buttons.danger")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary">
              {t("buttons.small")}
            </Button>
            <Button size="lg" iconEnd={<IconArrowForward />}>
              {t("buttons.large")}
            </Button>
            <Button loading>{t("buttons.loading")}</Button>
            <Button disabled variant="secondary">
              {t("buttons.disabled")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" iconStart={<IconArrowBack />}>
              {t("buttons.back")}
            </Button>
            <Button iconEnd={<IconArrowForward />}>{t("buttons.next")}</Button>
            <Button href="/dev/ui" variant="secondary">
              {t("buttons.link")}
            </Button>
            <Button variant="ghost" size="sm" iconStart={<IconPlus />}>
              {t("buttons.add")}
            </Button>
          </div>
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="fields" title={t("fields.heading")} note={t("fields.note")}>
        <form className="grid gap-6 rounded-card bg-surface p-6 shadow-card md:grid-cols-2">
          <Field label={t("fields.nameLabel")} hint={t("fields.nameHint")} required>
            {(control) => <Input {...control} name="name" autoComplete="name" />}
          </Field>
          <Field label={t("fields.emailLabel")} error={t("fields.emailError")} required>
            {(control) => (
              <Input {...control} type="email" name="email" autoComplete="email" defaultValue={SAMPLE_EMAIL} />
            )}
          </Field>
          <Field label={t("fields.phoneLabel")} hint={t("fields.phoneHint")}>
            {(control) => <Input {...control} type="tel" name="phone" autoComplete="tel" />}
          </Field>
          <Field label={t("fields.cityLabel")}>
            {(control) => (
              <Select
                {...control}
                name="city"
                defaultValue=""
                placeholder={t("fields.cityPlaceholder")}
                options={[
                  { value: "ramallah", label: t("fields.cityRamallah") },
                  { value: "nablus", label: t("fields.cityNablus") },
                  { value: "hebron", label: t("fields.cityHebron") },
                  { value: "bethlehem", label: t("fields.cityBethlehem") },
                ]}
              />
            )}
          </Field>
          <Field label={t("fields.messageLabel")} className="md:col-span-2">
            {(control) => <Textarea {...control} name="message" placeholder={t("fields.messagePlaceholder")} />}
          </Field>
          <div className="flex flex-col gap-4 md:col-span-2">
            <Checkbox name="terms" label={t("fields.termsLabel")} hint={t("fields.termsHint")} />
            <Checkbox name="news" label={t("fields.newsLabel")} error={t("fields.newsError")} />
            <Checkbox name="wrap" label={t("fields.disabledLabel")} disabled />
          </div>
        </form>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="cards" title={t("cards.heading")} note={t("cards.note")}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(["raised", "sunken", "outline", "brand"] as const).map((tone) => (
            <Card key={tone} as="article" tone={tone}>
              <CardHeader>
                <CardTitle>{t(`cards.${tone}Title`)}</CardTitle>
                <CardDescription>{t(`cards.${tone}Body`)}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="ghost" size="sm" iconEnd={<IconArrowForward size={18} />}>
                  {t("cards.action")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="dialog" title={t("dialog.heading")} note={t("dialog.note")}>
        <DialogDemo />
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="toast" title={t("toast.heading")} note={t("toast.note")}>
        <ToastDemo />
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="tabs" title={t("tabs.heading")} note={t("tabs.note")}>
        <TabsDemo />
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="badges" title={t("badges.heading")} note={t("badges.note")}>
        <div className="flex flex-wrap items-center gap-3">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {t(`badges.${tone}`)}
            </Badge>
          ))}
        </div>
      </GallerySection>
      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="table" title={t("table.heading")} note={t("table.note")}>
        <Table caption={t("table.caption")} columns={orderColumns} rows={SAMPLE_ORDERS} rowKey={(o) => o.ref} />
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="pagination" title={t("pagination.heading")} note={t("pagination.note")}>
        <div className="flex flex-col gap-6">
          <Pagination page={5} pageCount={12} pathname="/dev/ui" query={{ sort: "new" }} />
          <Pagination page={1} pageCount={3} pathname="/dev/ui" />
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="empty" title={t("empty.heading")} note={t("empty.note")}>
        <EmptyState
          icon={<IconCart size={28} />}
          title={t("empty.title")}
          description={t("empty.description")}
          headingLevel={3}
          action={<Button href="/dev/ui">{t("empty.action")}</Button>}
        />
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="skeleton" title={t("skeleton.heading")} note={t("skeleton.note")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="rounded-card bg-surface p-5 shadow-card" />
          <Skeleton className="rounded-card bg-surface p-5 shadow-card">
            <SkeletonBlock className="h-32 w-full rounded-card" />
            <SkeletonBlock className="w-1/2" />
            <SkeletonBlock className="h-6 w-1/4" />
          </Skeleton>
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="price" title={t("price.heading")} note={t("price.note")}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-card bg-surface p-5 shadow-card">
            <dt className="text-sm text-ink-soft">{t("price.regular")}</dt>
            <dd data-testid="price-regular">
              <PriceTag amount={agorot(11000)} size="lg" />
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-card bg-surface p-5 shadow-card">
            <dt className="text-sm text-ink-soft">{t("price.sale")}</dt>
            <dd data-testid="price-sale">
              <PriceTag amount={agorot(8950)} compareAt={agorot(11000)} size="lg" />
            </dd>
          </div>
        </dl>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="locale" title={t("locale.heading")} note={t("locale.note")}>
        <div className="flex flex-wrap items-center gap-6">
          <LocaleSwitcher />
          <LocaleSwitcher variant="link" />
        </div>
      </GallerySection>
    </>
  );
}
