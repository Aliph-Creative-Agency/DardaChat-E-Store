import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PermanentError } from "../adapters/errors";
import { mediaUrl, newStorageKey } from "./index";
import { isValidStorageKey, LocalStorageAdapter } from "./local";

const dirs: string[] = [];
async function adapter() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "dc-storage-"));
  dirs.push(dir);
  return new LocalStorageAdapter(dir);
}

afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

describe("LocalStorageAdapter", () => {
  it("put / get / exists / delete round trip with content type", async () => {
    const s = await adapter();
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await s.put("products/media/a.png", data, "image/png");
    expect(await s.exists("products/media/a.png")).toBe(true);
    const got = await s.get("products/media/a.png");
    expect(got?.contentType).toBe("image/png");
    expect(Buffer.compare(got!.data, data)).toBe(0);
    await s.delete("products/media/a.png");
    expect(await s.exists("products/media/a.png")).toBe(false);
    expect(await s.get("products/media/a.png")).toBeNull();
  });

  it.each(["../x", "/etc", "a/../../b", "A/b.png", "a//b", "./a", "a/b.png.meta.json", "", "a\\b"])(
    "rejects traversal / invalid key %j",
    async (key) => {
      const s = await adapter();
      expect(isValidStorageKey(key)).toBe(false);
      await expect(s.put(key, Buffer.from("x"), "text/plain")).rejects.toBeInstanceOf(PermanentError);
      await expect(s.get(key)).rejects.toBeInstanceOf(PermanentError);
    },
  );
});

describe("storage helpers", () => {
  it("newStorageKey builds a valid dated key", () => {
    const key = newStorageKey("Products/Media", ".WEBP", new Date("2026-09-26T10:00:00Z"));
    expect(key).toMatch(/^products\/media\/2026\/09\/[a-z0-9]{16}\.webp$/);
    expect(isValidStorageKey(key)).toBe(true);
  });

  it("mediaUrl keeps public paths and maps keys to the storage route", () => {
    expect(mediaUrl("/images/products/x.webp")).toBe("/images/products/x.webp");
    expect(mediaUrl("https://cdn.example.com/x.webp")).toBe("https://cdn.example.com/x.webp");
    expect(mediaUrl("products/media/2026/09/abc.webp")).toBe("/api/storage/products/media/2026/09/abc.webp");
  });
});
