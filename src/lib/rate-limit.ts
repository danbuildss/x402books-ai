// Per-IP in-memory rate limiter.
//
// In-memory means approximate on serverless (each instance has its own
// counters) — good enough as an abuse brake, not a billing meter.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map doesn't grow unbounded
function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true if the request is allowed, false if rate-limited. */
export function rateLimit(scope: string, ip: string, limit: number, windowMs: number): boolean {
  if (buckets.size > 10_000) sweep();

  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
