"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId="cmox5mu2p000e0cjp2stcldpu"
      config={{
        loginMethods: ["email", "google", "twitter", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#6DB874",
          logo: "/logo.svg",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
