import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { agent_name, wallet_address, x_handle, notes } = await request.json();

    const name = String(agent_name || "").trim();
    const wallet = String(wallet_address || "").trim().toLowerCase();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Agent name is required." }, { status: 400 });
    }
    if (!/^0x[0-9a-f]{40}$/i.test(wallet)) {
      return NextResponse.json({ error: "Enter a valid Base wallet address (0x…)." }, { status: 400 });
    }

    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ ok: true, queued: true }, { status: 201 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("agent_submissions").insert({
      agent_name: name,
      wallet_address: wallet,
      x_handle: x_handle ? String(x_handle).trim().replace(/^@/, "") : null,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
    });

    if (error?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (error) {
      return NextResponse.json({ error: "Could not submit. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
