import { LogoMark } from "@/components/logo";

export const metadata = { title: "Zetta — System Upgrade in Progress" };

export default function MaintenancePage() {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: "#0A0B0D",
        color: "#E8EAF0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>

          {/* Logo */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 48, color: "#E8EAF0" }}>
            <LogoMark size={28} />
            <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>zetta</span>
          </div>

          {/* Status chip */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 4,
              background: "rgba(244,185,66,0.10)",
              color: "#F4B942",
              border: "1px solid rgba(244,185,66,0.25)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#F4B942",
                display: "inline-block",
                animation: "pulse 2s ease-in-out infinite",
              }} />
              System upgrade in progress
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            margin: "0 0 16px",
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: "#F0F2F8",
          }}>
            Upgrading the financial intelligence layer.
          </h1>

          {/* Subtext */}
          <p style={{
            margin: "0 0 48px",
            fontSize: "0.95rem",
            lineHeight: 1.65,
            color: "#6B7280",
            maxWidth: 380,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            Zetta is undergoing a significant system upgrade. Registry, agent books, and Luca will be back shortly.
          </p>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginBottom: 32 }} />

          {/* Status rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
            {[
              { label: "Registry", status: "Upgrading", color: "#F4B942" },
              { label: "Agent Books", status: "Upgrading", color: "#F4B942" },
              { label: "Luca", status: "Upgrading", color: "#F4B942" },
              { label: "API", status: "Operational", color: "#4AE8A0" },
            ].map(({ label, status, color }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
              }}>
                <span style={{ fontSize: "0.8rem", color: "#9CA3AF", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                  {label}
                </span>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color,
                }}>
                  {status}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p style={{ marginTop: 48, fontSize: "0.75rem", color: "#374151" }}>
            © 2026 Zetta. Financial intelligence for autonomous agents.
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </body>
    </html>
  );
}
