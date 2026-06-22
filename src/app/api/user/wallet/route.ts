import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function getCodeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? "";
  return verifyAccessToken(token);
}

export async function GET() {
  const codeId = await getCodeId();
  if (!codeId) return NextResponse.json({ wallet: null });

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("access_codes")
    .select("wallet")
    .eq("id", codeId)
    .maybeSingle();

  return NextResponse.json({ wallet: data?.wallet ?? null });
}

export async function POST(request: Request) {
  const codeId = await getCodeId();
  if (!codeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const wallet = String(body.wallet || "").trim();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address format." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  await supabase
    .from("access_codes")
    .update({ wallet })
    .eq("id", codeId);

  return NextResponse.json({ ok: true });
}
