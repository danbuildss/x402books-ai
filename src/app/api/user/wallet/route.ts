import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function getCodeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? "";
  return verifyAccessToken(token);
}

function isPrivyUser(codeId: string) {
  return codeId.startsWith("privy:");
}

export async function GET() {
  const codeId = await getCodeId();
  if (!codeId) return NextResponse.json({ wallet: null });

  const supabase = getSupabaseAdminClient();

  if (isPrivyUser(codeId)) {
    const { data } = await supabase
      .from("users")
      .select("wallet")
      .eq("id", codeId)
      .maybeSingle();
    return NextResponse.json({ wallet: data?.wallet ?? null });
  }

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

  if (isPrivyUser(codeId)) {
    await supabase.from("users").update({ wallet }).eq("id", codeId);
  } else {
    await supabase.from("access_codes").update({ wallet }).eq("id", codeId);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const codeId = await getCodeId();
  if (!codeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  if (isPrivyUser(codeId)) {
    await supabase.from("users").update({ wallet: null }).eq("id", codeId);
  } else {
    await supabase.from("access_codes").update({ wallet: null }).eq("id", codeId);
  }

  return NextResponse.json({ ok: true });
}
