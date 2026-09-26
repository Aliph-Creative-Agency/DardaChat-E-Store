import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Phase 0 placeholder; W3 (shell) moves locale negotiation into proxy.ts with next-intl.
    return [{ source: "/", destination: "/ar", permanent: false }];
  },
};

export default nextConfig;
