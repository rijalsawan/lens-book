// Simple in-memory cache for frequent database queries
const cache = new Map<string, { data: any; expiry: number }>()

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = 30000): void {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlMs
  })
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now >= value.expiry) {
      cache.delete(key)
    }
  }
}, 2 * 60 * 1000) // Clean up every 2 minutes
