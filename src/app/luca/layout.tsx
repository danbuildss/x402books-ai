import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luca — AI Accountant for the Agent Economy | Zetta",
  description:
    "Luca audits wallets, categorizes transactions, detects anomalies, and delivers clean financial reports for autonomous agents and their operators. Powered by Zetta.",
  openGraph: {
    title: "Luca — AI Accountant for the Agent Economy",
    description:
      "Send Luca a wallet address. He audits it, categorizes transactions, scores financial health, and returns a clean report — instantly.",
    url: "https://x402books.xyz/luca",
    siteName: "Zetta",
    images: [
      {
        url: "/luca-avatar.png",
        width: 400,
        height: 400,
        alt: "Luca — AI Accountant",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Luca — AI Accountant for the Agent Economy",
    description:
      "Wallet audits, transaction categorization, anomaly detection, and financial scoring. Powered by Zetta.",
    images: ["/luca-avatar.png"],
    creator: "@AskLucaAI",
  },
};

export default function LucaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
