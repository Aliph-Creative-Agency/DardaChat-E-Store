import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/**
 * Locale negotiation (UI-001/UI-003). Authorisation is NOT done here: every admin page/handler calls
 * `requireStaff(permission)` itself. Accept-Language is stripped so `/` goes to the cookie locale or Arabic, never to
 * the browser language.
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
  // Skip API routes, Next internals and any path with a file extension (static assets).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
