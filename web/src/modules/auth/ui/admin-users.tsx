"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type SyntheticEvent, useId, useState } from "react";
import type { Locale } from "../guards";
import { roleLabel } from "./admin-format";
import { Alert, buttonCls, errorText, Field, inputCls, postJson, useSubmit } from "./forms";
import { authT } from "./t";

/**
 * Back-office Users controls (FR-ACC-013/014). They post JSON to /api/admin/users/** (every route is
 * `staffRoute("users.manage")`, so the server decides; the buttons only reflect the current state).
 */

const secondaryCls =
  "inline-flex items-center justify-center rounded-control border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-brand disabled:opacity-60";
const dangerCls =
  "inline-flex items-center justify-center rounded-control border border-danger bg-surface px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60";

export function CreateStaffUserForm({ locale, roles }: { locale: Locale; roles: string[] }) {
  const t = authT(locale);
  const router = useRouter();
  const roleId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles.includes("staff") ? "staff" : (roles[0] ?? ""));
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState<{ email: string; tempPassword?: string } | null>(null);
  const s = useSubmit();
  return (
    <section aria-labelledby={`${roleId}-title`} className="flex flex-col gap-4 rounded-control border border-line-strong p-4">
      <h2 id={`${roleId}-title`} className="text-lg font-semibold">
        {t("staff.users.create.title")}
      </h2>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) =>
          s.run(e, async () => {
            setCreated(null);
            const r = await postJson("/api/admin/users", { name, email, role, password: password || null });
            if (!r.ok) return s.setError(errorText(t, r));
            setCreated({ email, tempPassword: typeof r.tempPassword === "string" ? r.tempPassword : undefined });
            setName("");
            setEmail("");
            setPassword("");
            router.refresh();
          })
        }
      >
        <Field label={t("staff.users.create.name")} name="name" autoComplete="off" value={name} onChange={setName} />
        <Field
          label={t("common.email")}
          name="email"
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="off"
          value={email}
          onChange={setEmail}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={roleId} className="font-medium">
            {t("staff.users.create.role")}
          </label>
          <select id={roleId} name="role" className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(t, r)}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={t("staff.users.create.password")}
          name="password"
          type="password"
          autoComplete="new-password"
          required={false}
          hint={t("staff.users.create.passwordHint")}
          value={password}
          onChange={setPassword}
        />
        <div className="sm:col-span-2">
          <button type="submit" className={buttonCls} disabled={s.busy}>
            {s.busy ? t("common.working") : t("staff.users.create.submit")}
          </button>
        </div>
      </form>
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      {created ? (
        <Alert kind="info">
          {t("staff.users.create.created")}{" "}
          <bdi dir="ltr">{created.email}</bdi>
          {created.tempPassword ? (
            <>
              <br />
              {t("staff.users.create.tempPassword")}{" "}
              <code dir="ltr" data-testid="temp-password" className="font-mono font-semibold">
                {created.tempPassword}
              </code>
            </>
          ) : null}
        </Alert>
      ) : null}
    </section>
  );
}

type Action = "suspend" | "reinstate" | "revoke" | "resetTwoFactor";
const PATH: Record<Action, string> = {
  suspend: "suspend",
  reinstate: "reinstate",
  revoke: "revoke",
  resetTwoFactor: "reset-2fa",
};
const CONFIRM: Partial<Record<Action, true>> = { suspend: true, revoke: true, resetTwoFactor: true };

export interface ActionUser {
  id: string;
  name: string;
  status: "active" | "suspended" | "revoked";
  roles: string[];
  twoFactorEnabled: boolean;
}

/** Row/detail action buttons. Nothing is offered on your own account or on a revoked one. */
export function StaffUserActions({
  locale,
  user,
  roles,
  isSelf,
  showRole = false,
}: {
  locale: Locale;
  user: ActionUser;
  roles: string[];
  isSelf: boolean;
  showRole?: boolean;
}) {
  const t = authT(locale);
  const router = useRouter();
  const roleId = useId();
  const [role, setRole] = useState(user.roles[0] ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const s = useSubmit();
  if (isSelf || user.status === "revoked") return null;

  const act = (e: SyntheticEvent, action: Action | "changeRole") =>
    s.run(e as FormEvent, async () => {
      if (action !== "changeRole" && CONFIRM[action] && !window.confirm(t(`staff.users.confirm.${action}`, { name: user.name }))) {
        return;
      }
      setNotice(null);
      const r =
        action === "changeRole"
          ? await postJson(`/api/admin/users/${user.id}/role`, { role })
          : await postJson(`/api/admin/users/${user.id}/${PATH[action]}`, {});
      if (!r.ok) return s.setError(errorText(t, r));
      setNotice(t(`staff.users.done.${action}`, { name: user.name }));
      router.refresh();
    });

  const actions: Action[] =
    user.status === "active" ? ["suspend", "revoke"] : ["reinstate", "revoke"];
  if (user.twoFactorEnabled) actions.splice(1, 0, "resetTwoFactor");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            className={a === "revoke" ? dangerCls : secondaryCls}
            disabled={s.busy}
            onClick={(e) => act(e, a)}
            aria-label={`${t(`staff.users.action.${a}`)} — ${user.name}`}
          >
            {t(`staff.users.action.${a}`)}
          </button>
        ))}
      </div>
      {showRole ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={roleId} className="text-sm font-medium">
              {t("staff.users.action.changeRole")}
            </label>
            <select id={roleId} className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={secondaryCls}
            disabled={s.busy || role === (user.roles[0] ?? "")}
            onClick={(e) => act(e, "changeRole")}
          >
            {t("staff.users.action.saveRole")}
          </button>
        </div>
      ) : null}
      {s.error ? <Alert kind="error">{s.error}</Alert> : null}
      {notice ? <Alert kind="info">{notice}</Alert> : null}
    </div>
  );
}
