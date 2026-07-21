// P0 Bankr scope lock — single switch for the sprint.
//
// NEXT_PUBLIC_BANKR_ONLY=true hides non-Bankr agents and surfaces on every
// PUBLIC page and the public registry API. Admin (/luca-admin, /api/admin/*)
// is never scoped — it always sees every ecosystem.
//
// NEXT_PUBLIC_ vars are inlined at build time into both server and client
// bundles, so flipping the flag requires a redeploy. Unset (or any value
// other than "true") restores all ecosystems — no code changes needed.

export const BANKR_ONLY = process.env.NEXT_PUBLIC_BANKR_ONLY === "true";

export const FOCUS_ECOSYSTEM = "BANKR" as const;

/** Under the scope lock, keep only focus-ecosystem agents; otherwise pass through. */
export function scopeAgents<T extends { ecosystem: string }>(agents: T[]): T[] {
  return BANKR_ONLY ? agents.filter((a) => a.ecosystem === FOCUS_ECOSYSTEM) : agents;
}
