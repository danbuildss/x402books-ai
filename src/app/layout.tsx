import type { Metadata } from "next";
import { DM_Sans, Libre_Baskerville, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/privy-provider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.x402books.xyz"),
  title: "x402Books — Trust Infrastructure for Autonomous Agents",
  description:
    "Financial identity and trust infrastructure for autonomous agents. Verified wallets, trust scores, published methodology — and a Trust Check API any system can call before money moves.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "x402Books — Trust Infrastructure for Autonomous Agents",
    description: "One API call before money moves: trust score, confidence, recommendation. Verified agent identity, public methodology.",
    url: "https://www.x402books.xyz",
    siteName: "x402Books",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "x402Books — Trust Infrastructure for Autonomous Agents",
    description: "One API call before money moves: trust score, confidence, recommendation. Verified agent identity, public methodology.",
    site: "@x402Books",
    creator: "@x402Books",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.variable} ${libreBaskerville.variable} ${ibmPlexMono.variable} ${dmSans.className}`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
