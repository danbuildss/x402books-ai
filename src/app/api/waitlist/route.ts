import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getReferralCode(email: string) {
  return createHash("sha256").update(email).digest("base64url").slice(0, 8);
}

function getReferralUrl(request: Request, code: string) {
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return `${origin}/?ref=${code}`;
}

export async function POST(request: Request) {
  try {
    const { email, x_handle, use_case, pain_point } = await request.json();

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const referralCode = getReferralCode(normalizedEmail);
    const referralUrl = getReferralUrl(request, referralCode);

    const { error } = await supabase.from("waitlist_signups").insert({
      email: normalizedEmail,
      x_handle: x_handle ? String(x_handle).trim().replace(/^@/, "") : null,
      use_case: use_case ? String(use_case).trim() : null,
      pain_point: pain_point ? String(pain_point).trim() : null,
      source: "landing_page",
    });

    if (error?.code === "23505") {
      const { data: existing } = await supabase
        .from("waitlist_signups")
        .select("created_at")
        .eq("email", normalizedEmail)
        .single();

      const countQuery = supabase
        .from("waitlist_signups")
        .select("*", { count: "exact", head: true });

      const { count } = existing?.created_at
        ? await countQuery.lte("created_at", existing.created_at)
        : await countQuery;

      return NextResponse.json(
        {
          ok: true,
          alreadyJoined: true,
          position: count || 1,
          referralCode,
          referralUrl,
        },
        { status: 200 },
      );
    }

    if (error) {
      return NextResponse.json(
        { error: "Could not submit right now. Please try again." },
        { status: 500 },
      );
    }

    const { count } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });

    return NextResponse.json(
      {
        ok: true,
        alreadyJoined: false,
        position: count || 1,
        referralCode,
        referralUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Supabase")) {
      return NextResponse.json(
        { error: "Server is not configured yet." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
