const { cache } = require("./helpers");

describe("in-memory cache (TTL)", () => {
  let now;

  beforeEach(() => {
    cache.store.clear();
    now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  test("miss returns null for a key that was never set", () => {
    expect(cache.get("nope")).toBeNull();
    expect(cache.has("nope")).toBe(false);
  });

  test("hit returns the stored value", () => {
    cache.set("k", { a: 1 });
    expect(cache.get("k")).toEqual({ a: 1 });
    expect(cache.has("k")).toBe(true);
  });

  test("entry is still valid just before the 60s TTL and gone just after", () => {
    cache.set("k", "v");

    now += 59_999;
    expect(cache.get("k")).toBe("v");

    now += 2; // 60_001ms after set
    expect(cache.get("k")).toBeNull();
  });

  test("an expired entry is removed from the store when read", () => {
    cache.set("k", "v");
    now += 61_000;
    cache.get("k");
    expect(cache.size).toBe(0);
  });

  test("purgeExpired removes only expired entries", () => {
    cache.set("old", 1);
    now += 40_000;
    cache.set("fresh", 2);
    now += 30_000; // old is 70s old, fresh is 30s old

    cache.purgeExpired();

    expect(cache.size).toBe(1);
    expect(cache.get("fresh")).toBe(2);
    expect(cache.get("old")).toBeNull();
  });

  test("delete removes a single key", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe(2);
  });

  test("re-setting a key refreshes its TTL", () => {
    cache.set("k", "v1");
    now += 50_000;
    cache.set("k", "v2");
    now += 50_000; // 100s after first set, 50s after second
    expect(cache.get("k")).toBe("v2");
  });
});