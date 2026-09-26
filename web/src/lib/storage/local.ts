/** Local-disk storage adapter: objects under `root`, content type in a `<file>.meta.json` sidecar. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PermanentError } from "../adapters/errors";
import type { StorageAdapter, StoredObject } from "./types";

const KEY = /^[a-z0-9][a-z0-9/._-]*$/;
const META = ".meta.json";

export function isValidStorageKey(key: string): boolean {
  return (
    KEY.test(key) &&
    key.length <= 512 &&
    !key.split("/").some((seg) => seg === "" || seg === "." || seg === "..") &&
    !key.endsWith(META)
  );
}

export function resolveStorageDir(dir = process.env.STORAGE_DIR ?? "storage"): string {
  // Relative paths resolve from web/ (the cwd of next, vitest and the npm scripts).
  return path.resolve(process.cwd(), dir);
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly root: string;

  constructor(root = resolveStorageDir()) {
    this.root = path.resolve(root);
  }

  private file(key: string): string {
    if (!isValidStorageKey(key)) throw new PermanentError(`invalid storage key: ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new PermanentError(`invalid storage key: ${key}`);
    return full;
  }

  async put(key: string, data: Uint8Array | Buffer, contentType: string): Promise<void> {
    const file = this.file(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
    await fs.writeFile(file + META, JSON.stringify({ contentType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    const file = this.file(key);
    try {
      const data = await fs.readFile(file);
      let contentType = "application/octet-stream";
      try {
        contentType = (JSON.parse(await fs.readFile(file + META, "utf8")) as { contentType?: string }).contentType ?? contentType;
      } catch {
        // missing sidecar: keep the default
      }
      return { data, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "EISDIR") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.file(key);
    await fs.rm(file, { force: true });
    await fs.rm(file + META, { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await fs.stat(this.file(key))).isFile();
    } catch (error) {
      if (error instanceof PermanentError) throw error;
      return false;
    }
  }
}
