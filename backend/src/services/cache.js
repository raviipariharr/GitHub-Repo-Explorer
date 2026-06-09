/**
 * Simple in-memory cache with TTL expiration.
 * Keys expire after `ttl` milliseconds (default 60s).
 */
class Cache {
  constructor(ttl = 60_000) {
    this.store = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  // Remove all expired entries (call periodically to avoid memory leak)
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size() {
    return this.store.size;
  }
}

const cache = new Cache(60_000);

// Purge expired entries every 2 minutes
setInterval(() => cache.purgeExpired(), 2 * 60_000);

module.exports = cache;