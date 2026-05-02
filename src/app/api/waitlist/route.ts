import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
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
    const { error } = await supabase.from("waitlist_signups").insert({
      email: normalizedEmail,
      x_handle: x_handle ? String(x_handle).trim().replace(/^@/, "") : null,
      use_case: use_case ? String(use_case).trim() : null,
      pain_point: pain_point ? String(pain_point).trim() : null,
      source: "landing_page",
    });

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "You are already on the waitlist." },
        { status: 409 },
      );
    }

    if (error) {
      return NextResponse.json(
        { error: "Could not submit right now. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
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
