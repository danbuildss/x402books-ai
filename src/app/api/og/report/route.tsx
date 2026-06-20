import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "State of the Agent Economy";
  const summary = searchParams.get("summary") ?? "";
  const gdpRaw = searchParams.get("gdp");
  const agentsRaw = searchParams.get("agents");
  const type = searchParams.get("type") ?? "weekly";

  const gdp = gdpRaw ? parseFloat(gdpRaw) : null;
  const agents = agentsRaw ? parseInt(agentsRaw, 10) : null;

  const typeLabel = type === "monthly" ? "Monthly Report" : type === "quarterly" ? "Quarterly Report" : "Weekly Report";
  const displaySummary = summary.length > 180 ? summary.slice(0, 177) + "…" : summary;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#080c0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "52px 64px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Green top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "#6DB874",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                color: "#6DB874",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Zetta
            </span>
            <span style={{ color: "#2a3a2a", fontSize: 18 }}>|</span>
            <span style={{ color: "#4a5a4a", fontSize: 16, letterSpacing: "0.05em" }}>
              Financial Intelligence
            </span>
          </div>
          <span
            style={{
              background: "#0f1f0f",
              border: "1px solid #1a3a1a",
              color: "#6DB874",
              padding: "5px 16px",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {typeLabel.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 60 ? 38 : 46,
            fontWeight: 800,
            color: "#e8f5e8",
            lineHeight: 1.15,
            marginBottom: 20,
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Summary lede */}
        {displaySummary && (
          <div
            style={{
              fontSize: 20,
              color: "#6a7a6a",
              lineHeight: 1.55,
              marginBottom: 32,
              maxWidth: 860,
              flex: 1,
            }}
          >
            {displaySummary}
          </div>
        )}

        {!displaySummary && <div style={{ flex: 1 }} />}

        {/* Footer stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #1a2a1a",
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", gap: 48 }}>
            {gdp !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: "#4a5a4a", letterSpacing: "0.08em", fontWeight: 600 }}>
                  AGENT GDP (30D)
                </span>
                <span style={{ fontSize: 30, fontWeight: 700, color: "#6DB874", fontFamily: "monospace" }}>
                  {fmtUSD(gdp)}
                </span>
              </div>
            )}
            {agents !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: "#4a5a4a", letterSpacing: "0.08em", fontWeight: 600 }}>
                  ATTRIBUTED AGENTS
                </span>
                <span style={{ fontSize: 30, fontWeight: 700, color: "#e8f5e8", fontFamily: "monospace" }}>
                  {agents}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#6DB874" }}>By Luca</span>
            <span style={{ fontSize: 14, color: "#3a4a3a" }}>x402books.xyz/research</span>
          </div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
