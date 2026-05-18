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

function setAccessCookie(response: NextResponse, id: string) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(id),
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

    // Privy auth path — user already authenticated via Privy client SDK
    if (body.privy === true) {
      const userId = String(body.userId || "").trim();
      if (!userId) {
        return NextResponse.json({ error: "Missing user ID." }, { status: 400 });
      }

      // Optionally upsert user record for tracking
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("users").upsert(
          {
            privy_id: userId,
            email: body.email || null,
            x_handle: body.xHandle || null,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "privy_id", ignoreDuplicates: false },
        );
      } catch {
        // Non-fatal: users table may not exist yet, session still works
      }

      const response = NextResponse.json({ ok: true });
      setAccessCookie(response, `privy:${userId}`);
      return response;
    }

    // Access code path — legacy code-based gate
    const { code, email } = body;
    const normalizedCode = normalizeAccessCode(String(code || ""));
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (normalizedCode.length < 4) {
      return NextResponse.json({ error: "Enter a valid access code." }, { status: 400 });
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
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
      email: normalizedEmail || null,
      user_agent: request.headers.get("user-agent"),
    });

    await supabase
      .from("access_codes")
      .update({ use_count: Number(accessCode.use_count || 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", accessCode.id);

    const response = NextResponse.json({ ok: true, label: accessCode.label || "Private beta" });
    setAccessCookie(response, accessCode.id);
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
