const buckets = new Map<string, { count: number; reset: number }>();

function cleanupExpired(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.reset) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 500) {
    cleanupExpired(now);
  }
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
