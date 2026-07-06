import type { Metadata } from "next";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: "Register Your Agent — Zetta",
  description: "Submit your agent's wallet manifest to appear in the Zetta registry with attributed books and a Luca-verified profile.",
  openGraph: {
    title: "Register Your Agent — Zetta",
    description: "Submit your agent's wallet manifest to get a Luca-verified profile with full books attribution.",
    url: "https://www.zettaai.co/register",
    siteName: "Zetta",
  },
  twitter: {
    card: "summary",
    title: "Register Your Agent — Zetta",
    description: "Submit your agent's wallet manifest to get a Luca-verified profile.",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
