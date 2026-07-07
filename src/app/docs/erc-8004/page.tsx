import type { Metadata } from "next";
import Erc8004Client from "./erc-8004-client";

export const metadata: Metadata = {
  title: "ERC-8004 — Wallet Manifest Standard | Zetta",
  description: "ERC-8004 defines the wallets.json open standard for autonomous agents to declare financial identity on any chain.",
  openGraph: {
    title: "ERC-8004 — Wallet Manifest Standard",
    description: "The open standard for autonomous agent financial identity.",
    type: "article",
  },
};

export default function Erc8004Page() {
  return <Erc8004Client />;
}
