// Simple in-memory, per-IP rate limiter for public write endpoints.
//
// Known limitation: on serverless, each instance has its own map, so the
// effective limit is approximate (limit × concurrent instances) and resets
// on cold start. Good enough as a spam brake at current scale; move counters
// to Supabase/Redis when volume justifies it.

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Map<string, Entry>>();

export function rateLimit(
  scope: string,
  ip: string,
  limit: number,
  windowMs: number,
): boolean {
  let bucket = buckets.get(scope);
  if (!bucket) {
    bucket = new Map();
    buckets.set(scope, bucket);
  }

  const now = Date.now();
  const entry = bucket.get(ip);

  if (!entry || now > entry.resetAt) {
    bucket.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
