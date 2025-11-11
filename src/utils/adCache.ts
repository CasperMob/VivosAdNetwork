// Ad Cache utility for caching ad queries
// This helps reduce database load by caching frequently requested ad queries

interface CacheEntry {
  data: any
  timestamp: number
}

export class AdCache {
  private cache: Map<string, CacheEntry>
  private maxCacheSize: number
  private ttl: number // Time to live in milliseconds

  constructor(maxCacheSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map()
    this.maxCacheSize = maxCacheSize
    this.ttl = ttl
  }

  get(key: string): any | null {
    const normalizedQuery = this.normalizeKey(key)
    const entry = this.cache.get(normalizedQuery)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(normalizedQuery)
      return null
    }

    return entry.data
  }

  set(key: string, data: any): void {
    const normalizedQuery = this.normalizeKey(key)

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(normalizedQuery, {
      data,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  private normalizeKey(key: string): string {
    // Normalize the key (e.g., sort query parameters, lowercase, etc.)
    return key.toLowerCase().trim()
  }
}

// Export a singleton instance
export const adCache = new AdCache()

