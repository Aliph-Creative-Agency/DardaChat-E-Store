import { isValidStorageKey, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Serves objects from the local object store (media uploads). Keys are immutable, so cache for a year. */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }): Promise<Response> {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isValidStorageKey(key)) return new Response("Not found", { status: 404 });
  let object;
  try {
    object = await storage.get(key);
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(object.data), {
    status: 200,
    headers: {
      "content-type": object.contentType,
      "content-length": String(object.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
