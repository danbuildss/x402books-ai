"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId="cmox5mu2p000e0cjp2stcldpu"
      config={{
        loginMethods: ["google", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#4AE8A0",
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
