/**
 * Tiny in-process TTL cache with request de-duplication.
 *
 * Designed for read-heavy, aggregate endpoints (dashboards/analytics) where a few
 * seconds of staleness is acceptable but recomputing on every request is expensive.
 * Caching the in-flight promise also collapses concurrent requests for the same key
 * into a single database round-trip (stampede protection).
 */
type Entry = { promise: Promise<unknown>; expires: number };

const store = new Map<string, Entry>();

// Keep the map from growing without bound (e.g. per-user keys) by dropping expired
// entries once it gets large.
function prune(now: number): void {
  if (store.size < 500) return;
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.promise as Promise<T>;

  // Evict on failure so the next caller retries instead of caching a rejected promise.
  const promise = fn().catch((err) => {
    const current = store.get(key);
    if (current && current.promise === promise) store.delete(key);
    throw err;
  });

  prune(now);
  store.set(key, { promise, expires: now + ttlMs });
  return promise;
}

/** Drop a cached entry (or all entries when no key is given). */
export function invalidateCache(key?: string): void {
  if (key === undefined) store.clear();
  else store.delete(key);
}
