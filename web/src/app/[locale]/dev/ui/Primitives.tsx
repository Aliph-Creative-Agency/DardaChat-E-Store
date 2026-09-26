import { getTranslations } from "next-intl/server";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  ICONS,
  IconArrowBack,
  IconArrowForward,
  IconCart,
  IconPlus,
  Input,
  Select,
  Textarea,
  type BadgeTone,
} from "@/components/ui";
import { GallerySection } from "./Section";

/** SHL-06 gallery sections: icons, buttons, form fields, cards, badges. Server-rendered. */

const DIRECTIONAL = /Forward|Back|External/;
const BADGE_TONES: BadgeTone[] = ["neutral", "brand", "success", "warning", "danger", "info"];
const SAMPLE_EMAIL = "salma.example.com";

export async function PrimitivesGallery() {
  const t = await getTranslations("common.devUi");

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
            <Button iconStart={<IconCart />}>{t("buttons.primary")}</Button>
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

      <GallerySection id="badges" title={t("badges.heading")} note={t("badges.note")}>
        <div className="flex flex-wrap items-center gap-3">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {t(`badges.${tone}`)}
            </Badge>
          ))}
        </div>
      </GallerySection>
    </>
  );
}
