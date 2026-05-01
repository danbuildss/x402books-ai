import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "x402Books AI",
  description:
    "Readable books for the x402 economy. Turn Base USDC microtransactions into clean reports, categories, and agent-readable summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
