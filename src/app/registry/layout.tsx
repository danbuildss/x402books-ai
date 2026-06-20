import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Financial Registry | Zetta",
  description:
    "Track the wallets behind AI agents. Zetta indexes agent wallets across BANKR and Virtuals, scoring treasury health and flagging anomalies.",
  openGraph: {
    title: "Agent Financial Registry — Zetta",
    description:
      "10+ agent wallets tracked. Wallet roles, confidence labels, treasury health scores, and Luca-powered audit examples.",
    url: "https://x402books.xyz/registry",
    siteName: "Zetta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Agent Financial Registry — Zetta",
    description:
      "Track the wallets behind AI agents. Wallet roles, confidence labels, treasury health scores.",
    creator: "@ZettaFinance",
  },
};

export default function RegistryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
