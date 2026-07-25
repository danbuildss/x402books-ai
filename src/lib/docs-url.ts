// Canonical external documentation URL (GitBook).
// The in-app /docs pages are deprecated — all Docs links point here, and
// next.config redirects /docs/* to this host so old links keep working.
// Override with NEXT_PUBLIC_DOCS_URL if the GitBook space moves.
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.zettaai.co/quickstart";
