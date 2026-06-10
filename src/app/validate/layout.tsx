import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validate Agent Wallet Manifest | x402Books",
  description:
    "Paste your .agent/wallets.json and validate it against the Agent Wallet Manifest schema. Every valid manifest becomes an agent profile on x402Books.",
  openGraph: {
    title: "Validate Agent Wallet Manifest — x402Books",
    description:
      "Validate your wallets.json in seconds. Valid manifests are automatically indexed in the x402Books registry.",
    url: "https://www.x402books.xyz/validate",
    siteName: "x402Books",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Validate Agent Wallet Manifest — x402Books",
    description:
      "Paste your .agent/wallets.json and get instant schema validation.",
    creator: "@x402Books",
  },
};

export default function ValidateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
