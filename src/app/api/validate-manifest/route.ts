// POST /api/validate-manifest
// Stateless canonical manifest validation — no DB write, no auth required.

import { NextRequest, NextResponse } from "next/server";
import { parseManifest, validateManifest } from "@/lib/truth-engine/manifest-validator";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 51200) {
      return NextResponse.json({
        ok: false,
        errors: [{ code: "MANIFEST_TOO_LARGE", path: "$", message: "Manifest too large (max 50KB)" }],
      }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({
      ok: false,
      errors: [{ code: "INVALID_JSON", path: "$", message: "Invalid JSON" }],
    }, { status: 400 });
  }

  const validation = validateManifest(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, errors: validation.issues, warnings: validation.warnings }, { status: 422 });
  }

  const manifest = parseManifest(body);
  return NextResponse.json({
    ok: true,
    warnings: validation.warnings,
    summary: {
      version: manifest.version ?? null,
      agent_id: manifest.agent_id ?? null,
      agent: manifest.agent,
      project: manifest.project ?? null,
      ecosystem: manifest.ecosystem ?? null,
      wallets: manifest.wallets.length,
      roles: manifest.wallets.map((w) => w.role),
      control_proofs: manifest.wallets.map((w) => w.control_proof ?? "none"),
    },
  });
}
