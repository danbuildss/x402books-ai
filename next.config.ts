import type { NextConfig } from "next";

// Keep in sync with src/lib/docs-url.ts (next.config cannot import from src).
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.zettaai.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
    ],
  },
  async redirects() {
    // Documentation moved to GitBook — keep old in-app /docs links working.
    return [
      { source: "/docs", destination: DOCS_URL, permanent: false },
      { source: "/docs/:path*", destination: DOCS_URL, permanent: false },
    ];
  },
};

export default nextConfig;
