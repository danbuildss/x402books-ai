import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.ALCHEMY_API_KEY),
    stage: "1.6",
    services: {
      alchemy: Boolean(process.env.ALCHEMY_API_KEY),
      supabase: hasSupabaseAdminEnv(),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    endpoints: [
      "/api/scan?wallet=0x...&range=30d",
      "/api/ledger/summary?wallet=0x...&range=30d",
      "/api/ledger/transactions?wallet=0x...&range=30d",
      "/api/ledger/report?wallet=0x...&period=30d",
    ],
  });
}
