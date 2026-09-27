/** Object storage (SRS §3.3; local disk mock of S3-style storage). Keys: `^[a-z0-9][a-z0-9/._-]*$`, no `..`. */
export interface StoredObject {
  data: Buffer;
  contentType: string;
}

export interface StorageAdapter {
  put(key: string, data: Uint8Array | Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
