import { randomUUID } from "node:crypto";
import { test as base } from "@playwright/test";
import { createDb, defaultDatabaseUrl } from "../../../src/db/connection";
import { hashPassword } from "../../../src/modules/auth/crypto";
import { COOKIE_NAMES } from "../../../src/modules/auth/config";
import { createSession } from "../../../src/modules/auth/session";

/**
 * Signed-in Owner for specs that exercise the admin shell rather than sign-in itself (PLM-08). Creates a throwaway
 * Owner (so it never shares 2FA state with staff.spec's seeded owner) and a session whose second factor is already
 * done, then puts the staff cookie on the browser context. One Owner + session per worker.
 */
let cached: Promise<string> | undefined;

async function createOwnerSessionToken(): Promise<string> {
  const { db, client } = createDb(defaultDatabaseUrl(), { max: 1 });
  try {
    const email = `e2e-owner-${randomUUID().slice(0, 8)}@dardachat.test`;
    const passwordHash = await hashPassword(randomUUID());
    const [u] = await client`insert into staff_users (email, name, password_hash, must_change_password)
      values (${email}, ${"E2E Owner"}, ${passwordHash}, false) returning id`;
    await client`insert into user_roles (user_id, role_id) select ${u!.id}, id from roles where key = 'owner'`;
    const now = new Date();
    const { token } = await createSession(db, { type: "staff", id: u!.id as string }, {}, now, { secondFactorAt: now });
    return token;
  } finally {
    await client.end();
  }
}

export function ownerSessionToken(): Promise<string> {
  cached ??= createOwnerSessionToken();
  return cached;
}

/** `test` whose browser context carries a 2FA-complete Owner session cookie. */
export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    const url = new URL(baseURL ?? "http://localhost:3000");
    await context.addCookies([
      {
        name: COOKIE_NAMES.staff,
        value: await ownerSessionToken(),
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: false,
      },
    ]);
    await provide(context);
  },
});

export { expect } from "@playwright/test";
