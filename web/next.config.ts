import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Locale negotiation lives in src/proxy.ts (next-intl); messages load through src/lib/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // app/global-not-found.tsx: bilingual 404 for URLs no route matches (unknown locale); the app has no root layout
  // outside app/[locale], so a plain app/not-found.tsx cannot render there.
  experimental: { globalNotFound: true },
};

export default withNextIntl(nextConfig);
