const rateLimitMap = new Map<string, number[]>();

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    return false; // Rate limit exceeded
  }

  rateLimitMap.set(ip, [...recent, now]);
  return true;
}
