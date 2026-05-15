// Shared auth helper for all /api/v1/* routes.
// Extracts the API key from Authorization: Bearer <key> or X-API-Key header,
// validates it, and returns either a ValidatedKey or an error Response.

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
  const authHeader = request.headers.get("authorization") ?? "";
  const apiKeyHeader = request.headers.get("x-api-key") ?? "";

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
