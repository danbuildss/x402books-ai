// Shared auth helper for all /api/v1/* routes.
// Accepts: Authorization: Bearer <key>, X-API-Key header, or X-Internal-Secret (BANKR x402 handlers).

import { NextResponse } from "next/server";
import { validateApiKey, recordUsage } from "@/lib/api-keys";

export type V1AuthOk = {
  ok: true;
  keyId: string;
  finish: (statusCode: number, durationMs: number, endpoint: string, wallet?: string) => void;
};

export type V1AuthFail = {
  ok: false;
  response: Response;
};

export async function v1Auth(request: Request): Promise<V1AuthOk | V1AuthFail> {
  // BANKR x402 Cloud handlers authenticate with a shared internal secret
  const internalSecret = request.headers.get("x-internal-secret");
  if (internalSecret && process.env.XBOOKS_INTERNAL_SECRET && internalSecret === process.env.XBOOKS_INTERNAL_SECRET) {
    return {
      ok: true,
      keyId: "bankr-x402",
      finish() { /* x402 payments tracked by BANKR dashboard, not our DB */ },
    };
  }

  const authHeader   = request.headers.get("authorization") ?? "";
  const apiKeyHeader = request.headers.get("x-api-key")     ?? "";

  const raw = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : apiKeyHeader.trim();

  if (!raw) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing API key. Pass it as Authorization: Bearer <key> or X-API-Key header." },
        { status: 401 },
      ),
    };
  }

  const result = await validateApiKey(raw);

  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: result.message }, { status: result.status }),
    };
  }

  return {
    ok: true,
    keyId: result.key.id,
    finish(statusCode, durationMs, endpoint, wallet) {
      recordUsage({ keyId: result.key.id, endpoint, wallet, statusCode, durationMs });
    },
  };
}
