type CacheEntry<T> = { value: T; expiresAt: number };

const globalCache = globalThis as typeof globalThis & {
  __buskarteCache?: Map<string, CacheEntry<unknown>>;
  __buskartePending?: Map<string, Promise<unknown>>;
};

const store = globalCache.__buskarteCache ?? new Map<string, CacheEntry<unknown>>();
const pending = globalCache.__buskartePending ?? new Map<string, Promise<unknown>>();
globalCache.__buskarteCache = store;
globalCache.__buskartePending = pending;

export async function cached<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const existing = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();
  if (existing && existing.expiresAt > now) return existing.value;

  const inFlight = pending.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const promise = factory()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, promise);
  return promise;
}
