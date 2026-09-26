import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Locale negotiation lives in src/proxy.ts (next-intl); messages load through src/lib/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
