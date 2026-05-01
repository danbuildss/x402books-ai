import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "x402Books AI",
  description: "Readable books for the agent economy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
