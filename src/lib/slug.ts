// Canonical agent slug. Every part of the system — registry pages, claim
// routes, truth-engine ingestion, books — must derive slugs through this
// function so one agent name always maps to exactly one identity.
//
// "Sleuth.AI" → "sleuth-ai" (dots, apostrophes, and all other non-alphanumerics
// collapse to a single dash; leading/trailing dashes stripped).
export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
