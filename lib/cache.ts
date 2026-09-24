type CacheEntry<T> = { value: T; expiresAt: number };
const globalCache = globalThis as typeof globalThis & { __buskarteCache?: Map<string, CacheEntry<unknown>> };
const store = globalCache.__buskarteCache ?? new Map<string, CacheEntry<unknown>>();
globalCache.__buskarteCache = store;

export async function cached<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const existing = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();
  if (existing && existing.expiresAt > now) return existing.value;
  const value = await factory();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
