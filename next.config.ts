import type { NextConfig } from "next";

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
    // Scanner-era UI retired June 2026 — the registry is the app now.
    return ["/dashboard", "/transactions", "/portfolio", "/reports", "/wallets", "/categories"].map((source) => ({
      source,
      destination: "/registry",
      permanent: false,
    }));
  },
};

export default nextConfig;
