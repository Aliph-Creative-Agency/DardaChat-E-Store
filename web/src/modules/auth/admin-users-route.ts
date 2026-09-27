import "server-only";
import { z } from "zod";
import { fail, ok, readBody } from "./http";
import { staffRoute } from "./next";
import type { StaffUserError } from "./staff-users";

/**
 * Factory for `/api/admin/users/[id]/<action>` (FR-ACC-013/014): `users.manage` via `staffRoute`, id checked as a
 * UUID (unknown → 404), optional zod body, business refusals mapped to HTTP by `fail()`.
 */
const Id = z.uuid();

type Actor = { id: string };
type Meta = { ip?: string | null };

export function staffUserActionRoute<S extends z.ZodType | undefined = undefined>(
  run: (
    actor: Actor,
    targetId: string,
    meta: Meta,
    body: S extends z.ZodType ? z.infer<S> : undefined,
  ) => Promise<{ ok: true } | StaffUserError>,
  schema?: S,
) {
  return staffRoute<{ id: string }>("users.manage", async (req, { staff, params, ip }) => {
    if (!Id.safeParse(params.id).success) return fail({ ok: false, error: "not_found" });
    let body: unknown = undefined;
    if (schema) {
      const b = await readBody(req, schema);
      if (!b.ok) return b.res;
      body = b.data;
    }
    const r = await run({ id: staff.id }, params.id, { ip }, body as S extends z.ZodType ? z.infer<S> : undefined);
    return r.ok ? ok() : fail(r);
  });
}
