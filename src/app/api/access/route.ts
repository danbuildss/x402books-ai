import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  createAccessToken,
  hashAccessCode,
  normalizeAccessCode,
} from "@/lib/access-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCookie(response: NextResponse, tokenValue: string) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: tokenValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signin = Boolean(body.signin);
    const normalizedEmail = String(body.email || "").trim().toLowerCase();

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // ---- Sign in: returning user, email already in system ----
    if (signin) {
      const { data: redemption, error } = await supabase
        .from("access_code_redemptions")
        .select("id,access_code_id")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Could not verify your account right now." }, { status: 500 });
      }

      if (!redemption) {
        return NextResponse.json(
          { error: "No account found for this email. Sign up with a beta code first." },
          { status: 401 },
        );
      }

      const response = NextResponse.json({ ok: true, label: "Welcome back" });
      setCookie(response, createAccessToken(redemption.access_code_id));
      return response;
    }

    // ---- Sign up: new redemption with beta code ----
    const normalizedCode = normalizeAccessCode(String(body.code || ""));

    if (normalizedCode.length < 4) {
      return NextResponse.json({ error: "Enter a valid access code." }, { status: 400 });
    }

    const codeHash = hashAccessCode(normalizedCode);
    const { data: accessCode, error } = await supabase
      .from("access_codes")
      .select("id,label,max_uses,use_count,expires_at,revoked_at")
      .or(`code.eq.${normalizedCode},code_hash.eq.${codeHash}`)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Could not verify this code right now." }, { status: 500 });
    }

    if (!accessCode || accessCode.revoked_at) {
      return NextResponse.json({ error: "This access code is not valid." }, { status: 401 });
    }

    if (accessCode.expires_at && new Date(accessCode.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This access code has expired." }, { status: 401 });
    }

    if (
      typeof accessCode.max_uses === "number" &&
      typeof accessCode.use_count === "number" &&
      accessCode.use_count >= accessCode.max_uses
    ) {
      return NextResponse.json({ error: "This access code has reached its limit." }, { status: 401 });
    }

    await supabase.from("access_code_redemptions").insert({
      access_code_id: accessCode.id,
      email: normalizedEmail,
      user_agent: request.headers.get("user-agent"),
    });

    await supabase
      .from("access_codes")
      .update({ use_count: Number(accessCode.use_count || 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", accessCode.id);

    const response = NextResponse.json({ ok: true, label: accessCode.label || "Private beta" });
    setCookie(response, createAccessToken(accessCode.id));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Supabase")) {
      return NextResponse.json({ error: "Server is not configured yet." }, { status: 500 });
    }

    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
