const store = new Map();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function get(key) {
  const item = store.get(key);

  if (!item) return null;

  // Check expiration
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }

  return item.value;
}

function set(key, value, ttl = DEFAULT_TTL) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

module.exports = {
  get,
  set,
};