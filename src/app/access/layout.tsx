import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function AccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-root" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ flex: 1 }}>{children}</div>
      <SiteFooter />
    </div>
  );
}
