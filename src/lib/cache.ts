// SmartCache implementation for multi-level caching
export interface CacheConfig {
  walletStats: { ttl: number; maxEntries: number };
  leaderboard: { ttl: number; maxEntries: number };
  addressValidation: { ttl: number; maxEntries: number };
}

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class SmartCache<T = unknown> {
  private cache = new Map<string, CacheItem<T>>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  set(key: string, value: T, ttl: number) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    this.cleanup();
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    // Enforce max entries
    if (this.cache.size > this.maxEntries) {
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < this.cache.size - this.maxEntries; i++) {
        this.cache.delete(keys[i]);
      }
    }
  }
} 