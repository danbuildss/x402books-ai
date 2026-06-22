import type { ReactNode } from "react";
import { OpShell } from "@/components/op-shell";

export const metadata = {
  title: "Dashboard — Zetta",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <OpShell>{children}</OpShell>;
}
