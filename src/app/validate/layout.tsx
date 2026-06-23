import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validate Agent Wallet Manifest | Zetta",
  description:
    "Paste your .agent/wallets.json and validate it against the Agent Wallet Manifest schema. Every valid manifest becomes an agent profile on Zetta.",
  openGraph: {
    title: "Validate Agent Wallet Manifest — Zetta",
    description:
      "Validate your wallets.json in seconds. Valid manifests are automatically indexed in the Zetta registry.",
    url: "https://www.zettaai.co/validate",
    siteName: "Zetta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Validate Agent Wallet Manifest — Zetta",
    description:
      "Paste your .agent/wallets.json and get instant schema validation.",
    creator: "@ZettaFinance",
  },
};

export default function ValidateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
