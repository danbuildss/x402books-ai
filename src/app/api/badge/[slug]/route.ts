import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { AGENTS } from "@/app/registry/data";
import type { VerificationStatus } from "@/app/registry/types";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const STATUS_COLOR: Record<VerificationStatus, string> = {
  "Verified":           "#4AE8A0",
  "Luca Managed":       "#4AE8A0",
  "Claimed":            "#8B7CF6",
  "Wallets Declared":   "#5B9EF4",
  "Needs Verification": "#F4B942",
  "Candidate":          "var(--muted)",
  "ERC-8004 Indexed":   "var(--muted)",
  "Awaiting Manifest":  "#F4B942",
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
  "Verified":           "Verified",
  "Luca Managed":       "Luca Managed",
  "Claimed":            "Claimed",
  "Wallets Declared":   "Wallets Declared",
  "Needs Verification": "Needs Verification",
  "Candidate":          "Candidate",
  "ERC-8004 Indexed":   "ERC-8004 Indexed",
  "Awaiting Manifest":  "Awaiting Manifest",
};

function buildSvg(agentName: string, status: VerificationStatus): string {
  const leftText  = agentName.length > 20 ? agentName.slice(0, 18) + "…" : agentName;
  const rightText = STATUS_LABEL[status];
  const color     = STATUS_COLOR[status];

  // Approximate text widths (6.5px per char + 10px padding each side)
  const leftW  = Math.max(60, leftText.length * 6.5 + 20);
  const rightW = Math.max(60, rightText.length * 6.5 + 20);
  const totalW = leftW + rightW;
  const h      = 20;

  const leftCx  = leftW / 2;
  const rightCx = leftW + rightW / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${h}" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="${h}" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="${h}" fill="#555"/>
    <rect x="${leftW}" width="${rightW}" height="${h}" fill="${color}"/>
    <rect width="${totalW}" height="${h}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftCx + 1}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftCx}" y="14">${leftText}</text>
    <text x="${rightCx + 1}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${rightCx}" y="14">${rightText}</text>
  </g>
</svg>`;
}

function unknownSvg(slug: string): string {
  const leftText  = slug.length > 20 ? slug.slice(0, 18) + "…" : slug;
  const rightText = "not found";
  const leftW     = Math.max(60, leftText.length * 6.5 + 20);
  const rightW    = Math.max(60, rightText.length * 6.5 + 20);
  const totalW    = leftW + rightW;
  const h         = 20;
  const leftCx    = leftW / 2;
  const rightCx   = leftW + rightW / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <clipPath id="r"><rect width="${totalW}" height="${h}" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="${h}" fill="#555"/>
    <rect x="${leftW}" width="${rightW}" height="${h}" fill="var(--muted)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftCx + 1}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftCx}" y="14">${leftText}</text>
    <text x="${rightCx + 1}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${rightCx}" y="14">${rightText}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let agent: { name: string; verificationStatus: VerificationStatus } | null = null;
  try {
    const { agents } = await getRegistryAgents();
    agent = agents.find((a) => toSlug(a.name) === slug) ?? null;
  } catch {
    const found = AGENTS.find((a) => toSlug(a.name) === slug);
    if (found) agent = { name: found.name, verificationStatus: found.verificationStatus };
  }

  const svg = agent
    ? buildSvg(agent.name, agent.verificationStatus)
    : unknownSvg(slug);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type":  "image/svg+xml",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
