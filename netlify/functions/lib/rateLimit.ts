/**
 * In-memory rate limiter for serverless functions.
 *
 * Note: Each serverless instance has its own memory, so this limits per-instance.
 * For distributed rate limiting, use Redis or a database-backed solution.
 * This still provides meaningful protection against brute-force from a single
 * client hitting the same instance.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000; // 1 min
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests in the window */
  maxAttempts: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given key (e.g. IP address or email).
 * Returns whether the request is allowed and how long to wait if not.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count < opts.maxAttempts) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

/** Build a 429 response for rate-limited requests. */
export function rateLimitedResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return {
    statusCode: 429,
    headers: { "Retry-After": String(retryAfterSec) },
    body: JSON.stringify({ error: "Too many requests. Please try again later." }),
  };
}
