import { ImageResponse } from "next/og";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import { toSlug } from "./slug";
import type { Agent } from "@/app/registry/types";

export const alt = "Agent profile — x402Books Registry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getAgent(slug: string): Promise<Agent | null> {
  try {
    const { agents } = await getRegistryAgents();
    return agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    return AGENTS.find((a) => toSlug(a.name) === slug) ?? null;
  }
}

const HEALTH_COLOR: Record<string, string> = {
  Active:     "#16a34a",
  Stable:     "#2563eb",
  Unverified: "#d97706",
  Inactive:   "#dc2626",
  Pending:    "#52525b",
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgent(slug);

  if (!agent) {
    return new ImageResponse(
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "#fff", fontSize: 40 }}>Agent not found</span>
      </div>,
      { ...size },
    );
  }

  const health = agent.treasuryHealth ?? "Pending";
  const healthColor = HEALTH_COLOR[health] ?? "#52525b";
  const verdict = agent.adminNotes
    ? agent.adminNotes.slice(0, 180) + (agent.adminNotes.length > 180 ? "…" : "")
    : null;

  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "52px 60px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 36,
        }}
      >
        <span style={{ color: "#555", fontSize: 18, letterSpacing: "0.05em" }}>
          x402Books Registry
        </span>
        <span
          style={{
            background: healthColor,
            color: "#fff",
            padding: "5px 18px",
            borderRadius: 20,
            fontSize: 17,
            fontWeight: 600,
          }}
        >
          {health}
        </span>
      </div>

      {/* Name + symbol */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 12,
        }}
      >
        <span style={{ color: "#fff", fontSize: 62, fontWeight: 700, lineHeight: 1 }}>
          {agent.name}
        </span>
        <span style={{ color: "#555", fontSize: 28 }}>{agent.symbol}</span>
      </div>

      {/* Ecosystem + handle */}
      <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
        <span
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#888",
            padding: "3px 12px",
            borderRadius: 6,
            fontSize: 17,
          }}
        >
          {agent.ecosystem}
        </span>
        {agent.xHandle && (
          <span style={{ color: "#4a9eff", fontSize: 18 }}>{agent.xHandle}</span>
        )}
      </div>

      {/* Verdict */}
      {verdict ? (
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderLeft: "3px solid #3b82f6",
            borderRadius: 10,
            padding: "18px 22px",
            flex: 1,
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <span style={{ color: "#bbb", fontSize: 20, lineHeight: 1.6 }}>
            {verdict}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#555", fontSize: 17 }}>Status</span>
          <span style={{ color: healthColor, fontSize: 22, fontWeight: 700 }}>
            {agent.verificationStatus}
          </span>
        </div>
        <span style={{ color: "#333", fontSize: 17 }}>x402books.xyz</span>
      </div>
    </div>,
    { ...size },
  );
}
