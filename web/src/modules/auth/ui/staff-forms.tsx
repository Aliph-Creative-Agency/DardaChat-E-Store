"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../guards";
import { Alert, buttonCls, errorText, Field, postJson, useSubmit } from "./forms";
import { authT } from "./t";

/**
 * Back-office auth forms (FR-ACC-012, FR-ACC-015): password → (first time) authenticator enrolment + recovery
 * codes, or the TOTP/recovery challenge → optional forced password change → `next`.
 */

const withNext = (path: string, next: string) => `${path}?next=${encodeURIComponent(next)}`;

export function StaffSignInForm({ locale, next }: { locale: Locale; next: string }) {
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
          const r = await postJson("/api/auth/staff/sign-in", { email, password });
          if (!r.ok) return s.setError(errorText(t, r));
          const step = r.next === "enrol" ? "two-factor/setup" : "two-factor";
          router.push(withNext(`/${locale}/staff/${step}`, next));
        })
      }
    >
      <Field label={t("common.email")} name="email" type="email" autoComplete="username" inputMode="email" dir="ltr" value={email} onChange={setEmail} />
      <Field label={t("common.password")} name="password" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={setPassword} />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("staff.signIn.submit")}
      </button>
      <a className="underline" href={`/${locale}/staff/forgot-password`}>
        {t("signIn.forgot")}
      </a>
    </form>
  );
}

function afterSecondFactor(locale: Locale, next: string, mustChange: unknown): string {
  return mustChange ? withNext(`/${locale}/staff/change-password`, next) : next;
}

export function TwoFactorChallengeForm({ locale, next }: { locale: Locale; next: string }) {
  const t = authT(locale);
  const router = useRouter();
  const [code, setCode] = useState("");
  const s = useSubmit();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson("/api/auth/staff/two-factor/challenge", { code });
          if (!r.ok) return s.setError(errorText(t, r));
          router.push(afterSecondFactor(locale, next, r.mustChangePassword));
          router.refresh();
        })
      }
    >
      <Field label={t("staff.twoFactor.codeLabel")} name="code" autoComplete="one-time-code" dir="ltr" value={code} onChange={setCode} />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("staff.twoFactor.submit")}
      </button>
    </form>
  );
}

type Enrolment = { otpauthUri: string; groupedSecret: string };

export function TotpSetup({ locale, next }: { locale: Locale; next: string }) {
  const t = authT(locale);
  const router = useRouter();
  const started = useRef(false);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [recovery, setRecovery] = useState<{ codes: string[]; mustChange: unknown } | null>(null);
  const [code, setCode] = useState("");
  const s = useSubmit();

  useEffect(() => {
    if (started.current) return; // one secret per visit, also under StrictMode's double effect
    started.current = true;
    void postJson("/api/auth/staff/two-factor/enrol", {}).then((r) => {
      if (r.ok) setEnrolment({ otpauthUri: String(r.otpauthUri), groupedSecret: String(r.groupedSecret) });
      else s.setError(errorText(t, r));
    });
  }, [s, t]);

  if (recovery)
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("staff.setup.recoveryTitle")}</h2>
        <p>{t("staff.setup.recoveryIntro")}</p>
        <ul data-testid="recovery-codes" dir="ltr" className="grid grid-cols-2 gap-2 font-mono">
          {recovery.codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          type="button"
          className={buttonCls}
          onClick={() => {
            router.push(afterSecondFactor(locale, next, recovery.mustChange));
            router.refresh();
          }}
        >
          {t("staff.setup.continue")}
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <p>{t("staff.setup.intro")}</p>
      {enrolment ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{t("staff.setup.keyLabel")}</span>
            <code data-testid="totp-key" dir="ltr" className="rounded-control border border-line-strong px-3 py-2 font-mono">
              {enrolment.groupedSecret}
            </code>
            <a className="underline" href={enrolment.otpauthUri}>
              {t("staff.setup.openApp")}
            </a>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) =>
              s.run(e, async () => {
                const r = await postJson("/api/auth/staff/two-factor/confirm", { code });
                if (!r.ok) return s.setError(errorText(t, r));
                setRecovery({ codes: (r.recoveryCodes as string[]) ?? [], mustChange: r.mustChangePassword });
              })
            }
          >
            <Field label={t("staff.setup.codeLabel")} name="code" autoComplete="one-time-code" inputMode="numeric" dir="ltr" value={code} onChange={setCode} />
            {s.error ? <Alert kind="error">{s.error}</Alert> : null}
            <button type="submit" className={buttonCls} disabled={s.busy}>
              {s.busy ? t("common.working") : t("staff.setup.submit")}
            </button>
          </form>
        </>
      ) : s.error ? (
        <Alert kind="error">{s.error}</Alert>
      ) : (
        <p role="status">{t("staff.setup.loading")}</p>
      )}
    </div>
  );
}

export function ChangePasswordForm({ locale, next, minLength }: { locale: Locale; next: string; minLength: number }) {
  const t = authT(locale);
  const router = useRouter();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const s = useSubmit();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) =>
        s.run(e, async () => {
          const r = await postJson("/api/auth/staff/password/change", { currentPassword, newPassword });
          if (!r.ok) return s.setError(errorText(t, r));
          router.push(next);
          router.refresh();
        })
      }
    >
      <Field label={t("staff.changePassword.current")} name="currentPassword" type="password" autoComplete="current-password" dir="ltr" value={currentPassword} onChange={setCurrent} />
      <Field
        label={t("common.newPassword")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        hint={t("common.passwordHint", { min: minLength })}
        value={newPassword}
        onChange={setNew}
      />
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      <button type="submit" className={buttonCls} disabled={s.busy}>
        {s.busy ? t("common.working") : t("staff.changePassword.submit")}
      </button>
    </form>
  );
}
