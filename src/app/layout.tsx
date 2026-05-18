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
  title: "x402Books AI",
  description:
    "Readable books for the x402 economy. Turn Base USDC microtransactions into clean reports, categories, and agent-readable summaries.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "x402Books AI",
    description: "The financial intelligence layer for the agent economy.",
    url: "https://www.x402books.xyz",
    siteName: "x402Books AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "x402Books AI",
    description: "The financial intelligence layer for the agent economy.",
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
