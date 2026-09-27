import { hash, parseOptions, verify } from "@node-rs/argon2";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./config";

/** Opaque bearer token: 32 random bytes, base64url. Only `hashToken()` of it is ever stored. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time string compare (false on length mismatch without leaking where they differ). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** 6-digit one-time code, uniformly random. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** HMAC of a code bound to its target (phone/email + purpose) so a leaked table cannot be brute-forced offline cheaply. */
export function hashOtp(code: string, targetKey: string): string {
  return createHmac("sha256", getSessionSecret()).update(`${targetKey}\u0000${code}`, "utf8").digest("hex");
}

function secretKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", getSessionSecret(), Buffer.alloc(0), "dardachat:totp", 32));
}

/** AES-256-GCM; output `v1.<iv>.<tag>.<ciphertext>` (base64url parts). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("malformed sealed secret");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** OWASP argon2id baseline: m=19 MiB, t=2, p=1 (FR-ACC-005). */
export const ARGON2_PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export async function hashPassword(password: string): Promise<string> {
  // @node-rs/argon2 defaults to argon2id
  return hash(password, ARGON2_PARAMS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** True when a stored hash is weaker than the current params (or not argon2id) and should be re-hashed on sign-in. */
export function needsRehash(passwordHash: string): boolean {
  if (!passwordHash.startsWith("$argon2id$")) return true;
  try {
    const o = parseOptions(passwordHash);
    return (
      o.memoryCost < ARGON2_PARAMS.memoryCost || o.timeCost < ARGON2_PARAMS.timeCost || o.parallelism !== ARGON2_PARAMS.parallelism
    );
  } catch {
    return true;
  }
}

/** A fixed hash used to spend the same time verifying when the identity does not exist (no user enumeration). */
let dummyHash: Promise<string> | undefined;
export async function dummyVerify(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing-equalisation");
  await verifyPassword(await dummyHash, password);
}
