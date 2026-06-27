import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { NextRequest } from "next/server";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// IP-based rate limiting: max 5 submissions per 15 minutes per IP.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ipSubmissions = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmissions.get(ip);
  if (!entry || now > entry.resetAt) {
    ipSubmissions.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  try {
    const { agent_name, wallet_address, x_handle, notes, gitlawb_repo, b20_token_address } = await request.json();

    const name = String(agent_name || "").trim();
    const wallet = String(wallet_address || "").trim().toLowerCase();
    const repo = gitlawb_repo ? String(gitlawb_repo).trim().slice(0, 300) : null;

    // b20_token_address is optional and stored as-is for manual admin review.
    // Validation: if provided, must look like an address. Prefix check (0xB200) is
    // done by the admin during review — not enforced here to avoid silent rejections.
    const b20Addr = b20_token_address
      ? String(b20_token_address).trim().toLowerCase().slice(0, 42)
      : null;
    const b20AddrClean = b20Addr && /^0x[0-9a-f]{40}$/.test(b20Addr) ? b20Addr : null;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Agent name is required." }, { status: 400 });
    }
    if (!/^0x[0-9a-f]{40}$/i.test(wallet)) {
      return NextResponse.json({ error: "Enter a valid Base wallet address (0x…)." }, { status: 400 });
    }

    const agentSlug = toSlug(name);

    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ ok: true, slug: agentSlug, queued: true, message: "Submitted for verification." }, { status: 201 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from("agent_submissions").insert({
      agent_name: name,
      wallet_address: wallet,
      x_handle: x_handle ? String(x_handle).trim().replace(/^@/, "") : null,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      gitlawb_repo: repo,
      b20_token_address: b20AddrClean,
    }).select("id").single();

    if (error?.code === "23505") {
      return NextResponse.json({ ok: true, slug: agentSlug, duplicate: true }, { status: 200 });
    }
    if (error) {
      return NextResponse.json({ error: "Could not submit. Please try again." }, { status: 500 });
    }

    const ref_id = data?.id ? (data.id as string).slice(0, 8).toUpperCase() : null;

    return NextResponse.json({ ok: true, slug: agentSlug, ref_id, message: "Submitted for verification." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
