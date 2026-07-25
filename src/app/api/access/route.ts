import { NextResponse } from "next/server";
import { ACCESS_COOKIE_MAX_AGE, ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/access-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function setAccessCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(userId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { userId?: string; email?: string | null; xHandle?: string | null };
    const userId = String(body.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "Missing user ID." }, { status: 400 });

    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from("users").upsert(
        {
          id:           `privy:${userId}`,
          email:        body.email    || null,
          x_handle:     body.xHandle || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: false },
      );
    } catch { /* non-fatal */ }

    const response = NextResponse.json({ ok: true });
    setAccessCookie(response, `privy:${userId}`);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: ACCESS_COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return response;
}
