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
  metadataBase: new URL("https://www.zettaai.co"),
  title: "Zetta",
  description:
    "Financial Intelligence for the Agent Economy. Understand how autonomous agents earn, spend, grow, and operate.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Zetta",
    description: "Financial Intelligence for the Agent Economy.",
    url: "https://www.zettaai.co",
    siteName: "Zetta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Zetta",
    description: "Financial Intelligence for the Agent Economy.",
    site: "@ZettaFinance",
    creator: "@ZettaFinance",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
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
