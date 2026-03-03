/**
 * Simple in-memory rate limiter for serverless environments.
 * Note: On Vercel, each cold start resets the map.
 * For production with high traffic, migrate to @upstash/ratelimit.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if a request is within rate limits.
 * @param identifier - Unique key (e.g., userId or IP)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = requestCounts.get(identifier)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
