# Shell, i18n and components: how to use them

Owned by **platform** (lane `shell`). Module teams use everything here, but only platform changes it. To change a
component, a nav registry, `common.json` or the tokens, append an entry to `.orchestration/CHANGE-REQUESTS.md` and
work around it locally until it lands.

Arabic (`ar`, RTL) is the default locale; English (`en`, LTR) is the second. Every URL carries its locale
(`/ar/...`, `/en/...`). `/` sends visitors to their `NEXT_LOCALE` cookie or to `/ar`. `Accept-Language` is ignored
on purpose.

---

## 1. Messages (next-intl)

- Your copy lives in `messages/ar/<namespace>.json` and `messages/en/<namespace>.json`. Your namespace is your module
  name (`catalog`, `orders`, `payments`, ...). The list is in `src/lib/i18n/namespaces.ts`. A file that doesn't exist
  yet loads as `{}`, so you start using your namespace by creating the file **in both locales**.
- Server components: `const t = await getTranslations("orders")`. Client components: `const t = useTranslations("orders")`.
  Pages and layouts under `[locale]` call `setRequestLocale(locale)` first (static rendering).
- The guard tests (`src/lib/i18n/*.test.ts`, which run in `npm test`) enforce these rules:
  - both locales have the same key set, and no value is empty;
  - every Arabic value contains Arabic script (Latin-only keys such as brand names go in `LATIN_ONLY_ALLOWED` in `messages.test.ts`; values with no letters pass anyway);
  - ICU placeholders `{name}` are identical in both locales;
  - **no hard-coded UI text** in `src/app/**`, `src/components/**` or `src/modules/**/ui/**`: this covers JSX text and
    string literals in `aria-label`, `title`, `placeholder` and `alt`. Escape hatch: `// i18n-ignore` on that line,
    with a reason.
- Arabic copy is real Arabic written for Palestinian customers. Digits are Latin (0-9) in both locales.

## 2. Links and redirects

Import from `@/lib/i18n/navigation`, **never** from `next/link` or `next/navigation`:
`Link`, `redirect`, `permanentRedirect`, `usePathname`, `useRouter`, `getPathname`. Hrefs are written without the
locale (`<Link href="/orders">`) and get the current locale prefix automatically. To switch locale, use `<LocaleSwitcher />`.
It keeps the path and query, sets `NEXT_LOCALE`, and saves the preference for signed-in users (see §8).

> Unit tests that render something using `@/lib/i18n/navigation` must `vi.mock` it until the vitest `next-intl`
> inline CR lands (see `src/components/ui/data-display.test.tsx`).

## 3. Formatting and bidi (`src/lib/i18n/format.ts`, `bidi.ts`)

| Helper | Notes |
| --- | --- |
| `formatMoney(agorot, locale)` | Takes integer agorot and delegates to `src/lib/money.ts`. Never format money yourself. |
| `formatNumber`, `formatPercent(ratio)` | Latin digits (`-u-nu-latn`). |
| `formatDate(v, locale, "short"\|"medium"\|"long")`, `formatTime`, `formatDateTime` | Always shown in Asia/Jerusalem. Arabic uses Levantine month names (أيلول). |
| `formatPhone(e164)` | E.164, LTR-isolated. |
| `isolate(s)` / `ltr(s)` / `rtl(s)` | Wrap a value in FSI/LRI/RLI…PDI before putting it in a sentence (order numbers, SKUs, phones, Latin names). `isolateValues(obj)` does every ICU value at once. |
| `<Bdi>` | JSX equivalent for mixed-direction content. |

Example: `t("orderPlaced", isolateValues({ number: "DC-7K3M-9QPT" }))` keeps the punctuation in the right place
in Arabic. next-intl's `formats` in `request.ts` use the same settings, so `{d, date, medium}` inside messages matches.

## 4. RTL rules

- Use **logical** Tailwind classes only: `ms-/me-/ps-/pe-`, `start-/end-`, `text-start/end`, `rounded-s/e-*`,
  `border-s/e`. The guard `logical-classes.test.ts` fails on `ml-`, `pr-`, `left-`, `text-right`, `rounded-l-`,
  `border-r`, `float-left`, `space-x-reverse`, and similar. For a physical class you really need, add `// i18n-ignore`
  on that line with a reason.
- Layout mirrors automatically: the store nav and the admin sidebar sit on the start side (the right in Arabic).
- **Icons** (`@/components/ui` `Icon*`) inherit `currentColor` and are `aria-hidden`. Directional icons are named by
  meaning (`IconChevronForward`, `IconArrowBack`) and flip in RTL (`rtl:-scale-x-100`). Never choose an icon by the
  side of the screen it points to.
- Arabic line-height is 1.8 (needed for tashkeel). Don't tighten it on Arabic text.

## 5. Design tokens and type

The tokens are in `src/app/globals.css` (`@theme`). Colours are `paper`/`ink`/`brand`/`accent`/`pink`/`sky`/`line` plus the
semantic `success`/`warning`/`danger`/`info`, each with a `-soft` background. There are also radius tokens
(`rounded-control`, `rounded-card`, `rounded-pill`), shadow and motion tokens (`duration-fast`, `ease-soft`),
and a reduced-motion fallback. Contrast pairs are checked in `tokens.test.ts`: add a pair there when you introduce
a new text/background combination.
Fonts: the body is IBM Plex Sans Arabic / IBM Plex Sans. The display face is **Baloo Bhaijaan 2, for h1/h2 and the
wordmark only** (prices, quantities and order numbers never use it; `PriceTag` pins `font-sans`). h3-h6 and any heading under 20px use the body font at semibold. For a small h2, add
`font-sans font-semibold`. Every focusable element gets the global 3px `:focus-visible` ring; don't remove it.
Live gallery (dev only): `/ar/dev/ui`, `/en/dev/ui`.

## 6. Components (`@/components/ui`)

| Component | Key props | Notes |
| --- | --- | --- |
| `Button` | `variant` primary/secondary/ghost/danger, `size` sm/md/lg, `loading`, `iconStart/iconEnd`, `fullWidth`, `href` | With `href` it renders a localized link. `loading` sets `aria-busy` and keeps the label. `buttonClasses()` is available for custom elements. |
| `Field` | `label`, `hint`, `error`, `required`, `children(control)` | Render prop: spread `control` (id, `aria-describedby`, `aria-invalid`) onto `Input`/`Textarea`/`Select`. The error shows an icon plus text. |
| `Input`, `Textarea`, `Select` (`options`, `placeholder`), `Checkbox` (`label`, `hint`, `error`) | native attrs | 44px targets. |
| `Card`, `CardHeader`, `CardTitle` (`as` h2/h3/h4), `CardDescription`, `CardFooter` | `tone` raised/sunken/outline/brand | CardTitle defaults to h3 (body font, semibold). |
| `Badge` | `tone` neutral/brand/success/warning/danger/info, `icon` | Always shows text too, never colour alone. |
| `Dialog` (client) | `open`, `onClose`, `title`, `description`, `footer`, `size`, `dismissOnBackdrop` | Uses native `<dialog>`: Esc closes it, focus returns to the trigger, scroll is locked. |
| `ToastProvider` / `useToast()` (client) | `toast({ title, description, tone, duration })`, `dismiss(id)` | The provider is already mounted in `[locale]/layout.tsx`. Uses `status`, or `alert` for errors, and pauses on hover/focus. |
| `Tabs` (client) | `label`, `tabs: {id,label,content,disabled}[]`, `defaultValue` / `value` + `onValueChange` | WAI-ARIA tabs. Arrow keys follow the visual direction. Home/End work. |
| `Table` | `caption` (+`captionHidden`), `columns: {id,header,cell,numeric,rowHeader}[]`, `rows`, `rowKey`, `empty`, `density` | Scrolls sideways inside its own region, so the page never does. Numeric columns are end-aligned. |
| `Pagination` | `page`, `pageCount`, `pathname`, `query`, `param` | Localized links, `aria-current`, and "page x of y" text. |
| `EmptyState` | `icon`, `title`, `description`, `action`, `headingLevel` | |
| `Skeleton`, `SkeletonBlock` | `lines`, `label` | Sets `aria-busy` and respects reduced motion. |
| `PriceTag` | `amount` (agorot), `compareAt`, `size` | The sale price includes sr-only "now/was" text. |
| `LocaleSwitcher` (client) | `variant` link/pill | |
| `Bdi` | `dir` | |

Layout parts (`@/components/shell`) are used by platform layouts only: `StoreHeader` (`cartSlot`,
`assistantSlot`), `StoreFooter`, `MobileMenu`, `SkipLink`, `AdminShell`, `AdminSidebar`, `AdminTopbar`, `Wordmark`,
`NavLink`, `CartButton`. The orders and assistant teams fill the header slots through a CR to platform.

## 7. Navigation registries (read-only for teams)

- Storefront: `src/lib/nav/store-nav.ts` (`STORE_PRIMARY_NAV`, `STORE_UTILITY_NAV`, `STORE_POLICY_NAV`). Labels are
  `common.json` `nav.store.*`.
- Admin: `src/lib/nav/admin-nav.ts` (`ADMIN_NAV`). Each item is `{ id, href, labelKey, icon, permission, group }`. There
  is one entry for every module section. `filterNav(items, permissions)` is deny-by-default. The permission keys are
  auth's registry keys. To add or move an item, send a CR to platform.
- Your admin page lives at the item's `href` (`src/app/[locale]/admin/<section>/page.tsx`). Until it exists, the URL
  shows the in-shell "section not built yet" page (404) with the item marked current.
- Hiding a nav item is **not** authorisation. Every admin page and handler still calls `requireStaff(permission)`
  from `@/modules/auth`.

## 8. Viewer seam (`src/lib/shell/viewer.ts`)

Layouts learn who is looking only through `getShellViewer()` (staff: name, role, permissions → sidebar and topbar)
and `getShellSubject()` (a signed-in staff member or customer → locale persistence). Phase 0 stub: a dev Owner with
every nav permission outside production, `null` in production, and a `null` subject. At merge these are wired to
auth's session. `rememberLocale(locale)` (a server action in `src/lib/i18n/actions.ts`) calls
`persistLocalePreference(subject, locale)` (the ONE locale-preference writer; auth's `setSubjectLocale` was removed at the merge) when there is a subject, which writes `staff_users.locale` /
`customers.locale` inside `withActor`.

## 9. Errors and not-found

- **Copy convention:** every error message says **what happened** and **what to do**, in both locales. Generic codes
  (`notFound`, `unauthorized`, `forbidden`, `validation`, `conflict`, `rateLimited`, `network`, `unavailable`,
  `server`) live in `common.json` `errors.codes.*`. Map any code or HTTP status with `errorMessageKey(code)` /
  `errorCodeFromStatus(status)` from `@/lib/i18n/errors` (aliases like `not_found` are accepted, and unknown codes fall back to
  `server`). Module-specific errors go in your own namespace and follow the same two-part rule.
- `notFound()` in a store page renders the localized 404 inside the store chrome. Under `/admin` it renders inside the
  admin shell. Thrown errors are caught by `[locale]/error.tsx` or `admin/error.tsx`, which use the `retry` prop.
  `global-error.tsx` and `global-not-found.tsx` are bilingual and run without providers.

## 10. Tests you get for free

`npm test` runs the i18n/RTL guards and the component render tests. `tests/e2e/platform/shell-*.spec.ts` cover
locale routing, components, the store and admin shells, errors, and a11y. The a11y check runs axe-core with WCAG 2.2
A/AA at 1440 and 375, checks for sideways scroll at 320..1440, and walks every Tab stop checking the focus ring. When
you add a page, add its URL to the `PAGES` list in `shell-a11y.spec.ts` through your own spec or a CR.
