"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import type { Locale } from "../guards";
import { authT, type AuthT } from "./t";

/**
 * Minimal, accessible auth forms (FR-ACC-001/002/006). They post JSON to /api/auth/* and navigate on success.
 * STOREFRONT / W3 restyle them later; only logical CSS (start/end) is used so rtl and ltr both work.
 */

export type ApiResult = { ok?: boolean; error?: string; retryAfterMs?: number; problems?: string[]; [k: string]: unknown };

export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    return res.ok ? { ...data, ok: true } : { ...data, ok: false, error: data.error ?? "unknown" };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export function errorText(t: AuthT, r: ApiResult): string {
  const code = r.error ?? "unknown";
  if (code === "weak_password" && r.problems?.length) return r.problems.map((p) => t(`errors.${p}`)).join(" ");
  if (code === "rate_limited") return t("errors.rate_limited", { minutes: Math.max(1, Math.ceil((r.retryAfterMs ?? 60_000) / 60_000)) });
  const text = t(`errors.${code}`);
  return text === `errors.${code}` ? t("errors.unknown") : text;
}

export const inputCls =
  "w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus";
export const buttonCls =
  "inline-flex items-center justify-center rounded-control bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60";

export function Field(props: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  inputMode?: "email" | "tel" | "numeric" | "text";
  dir?: "ltr" | "rtl" | "auto";
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {props.label}
      </label>
      <input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        dir={props.dir}
        required={props.required ?? true}
        aria-describedby={props.hint ? hintId : undefined}
        className={inputCls}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {props.hint}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({ kind, children }: { kind: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={
        kind === "error"
          ? "rounded-control border border-danger bg-danger-soft px-3 py-2 text-ink"
          : "rounded-control border border-success bg-success-soft px-3 py-2 text-ink"
      }
    >
      {children}
    </p>
  );
}

export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(e: FormEvent, fn: () => Promise<void>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function EmailSignIn({ locale, next }: { locale: Locale; next: string }) {
  const t = authT(locale);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const s = useSubmit();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson("/api/auth/customer/sign-in", { email, password });
          if (r.ok) {
            router.push(next);
            router.refresh();
          } else s.setError(errorText(t, r));
        })
      }
    >
      <Field label={t("common.email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" value={email} onChange={setEmail} />
      <Field label={t("common.password")} name="password" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={setPassword} />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("signIn.submit")}
      </button>
      <a className="underline" href={`/${locale}/forgot-password`}>
        {t("signIn.forgot")}
      </a>
    </form>
  );
}

function PhoneSignIn({ locale, next }: { locale: Locale; next: string }) {
  const t = authT(locale);
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const s = useSubmit();
  const request = () =>
    postJson("/api/auth/customer/otp/request", { phone, locale }).then((r) => {
      if (r.ok) setSent(true);
      else s.setError(errorText(t, r));
    });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          if (!sent) return request();
          const r = await postJson("/api/auth/customer/otp/verify", { phone, code, locale });
          if (r.ok) {
            router.push(next);
            router.refresh();
          } else s.setError(errorText(t, r));
        })
      }
    >
      <Field
        label={t("common.phone")}
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        dir="ltr"
        hint={t("signIn.phoneHint")}
        value={phone}
        onChange={(v) => {
          setPhone(v);
          setSent(false);
        }}
      />
      {sent ? (
        <>
          <Alert kind="info">
            {t("signIn.codeSent", { phone: "⁦" + phone + "⁩" })}
          </Alert>
          <Field label={t("common.code")} name="code" autoComplete="one-time-code" inputMode="numeric" dir="ltr" value={code} onChange={setCode} />
        </>
      ) : null}
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : sent ? t("signIn.verify") : t("signIn.sendCode")}
      </button>
      {sent ? (
        <button type="button" className="self-start underline" disabled={s.busy} onClick={() => void request()}>
          {t("signIn.resend")}
        </button>
      ) : null}
    </form>
  );
}

export function SignInForms({ locale, next }: { locale: Locale; next: string }) {
  const t = authT(locale);
  const [tab, setTab] = useState<"email" | "phone">("email");
  const tabs = [
    { key: "email", label: t("signIn.tabEmail") },
    { key: "phone", label: t("signIn.tabPhone") },
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t("signIn.title")} className="flex gap-2 border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.key}
            id={`tab-${x.key}`}
            role="tab"
            type="button"
            aria-selected={tab === x.key}
            aria-controls={`panel-${x.key}`}
            className={`-mb-px border-b-2 px-3 py-2 ${tab === x.key ? "border-brand font-semibold" : "border-transparent"}`}
            onClick={() => setTab(x.key)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "email" ? <EmailSignIn locale={locale} next={next} /> : <PhoneSignIn locale={locale} next={next} />}
      </div>
    </div>
  );
}

export function SignUpForm({ locale, next, minLength }: { locale: Locale; next: string; minLength: number }) {
  const t = authT(locale);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const s = useSubmit();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson("/api/auth/customer/register", { name, email, password, locale });
          if (r.ok) {
            router.push(next);
            router.refresh();
          } else s.setError(errorText(t, r));
        })
      }
    >
      <Field label={t("common.name")} name="name" autoComplete="name" required={false} value={name} onChange={setName} />
      <Field label={t("common.email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" value={email} onChange={setEmail} />
      <Field
        label={t("common.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        hint={t("common.passwordHint", { min: minLength })}
        value={password}
        onChange={setPassword}
      />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("signUp.submit")}
      </button>
    </form>
  );
}

/** Used by the customer and the staff "forgot password" pages. */
export function ForgotForm({ locale, endpoint }: { locale: Locale; endpoint: string }) {
  const t = authT(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const s = useSubmit();
  if (sent) return <Alert kind="info">{t("forgot.sent")}</Alert>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson(endpoint, { email });
          if (r.ok) setSent(true);
          else s.setError(errorText(t, r));
        })
      }
    >
      <Field label={t("common.email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" value={email} onChange={setEmail} />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("forgot.submit")}
      </button>
    </form>
  );
}

/** Used by the customer and the staff "reset password" pages. */
export function ResetForm(props: { locale: Locale; endpoint: string; token: string; minLength: number; signInHref: string }) {
  const t = authT(props.locale);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const s = useSubmit();
  if (!props.token) return <Alert kind="error">{t("reset.missingToken")}</Alert>;
  if (done)
    return (
      <div className="flex flex-col gap-4">
        <Alert kind="info">{t("reset.done")}</Alert>
        <a className="underline" href={props.signInHref}>
          {t("common.backToSignIn")}
        </a>
      </div>
    );
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson(props.endpoint, { token: props.token, password });
          if (r.ok) setDone(true);
          else s.setError(errorText(t, r));
        })
      }
    >
      <Field
        label={t("common.newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        hint={t("common.passwordHint", { min: props.minLength })}
        value={password}
        onChange={setPassword}
      />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("reset.submit")}
      </button>
    </form>
  );
}

export function SignOutButton({ locale, endpoint, redirectTo }: { locale: Locale; endpoint: string; redirectTo: string }) {
  const t = authT(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={buttonCls}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJson(endpoint, {});
        router.push(redirectTo);
        router.refresh();
      }}
    >
      {t("account.signOut")}
    </button>
  );
}
