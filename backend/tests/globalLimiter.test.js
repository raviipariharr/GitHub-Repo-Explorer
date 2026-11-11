const request = require("supertest");
const { createApp, resetState } = require("./helpers");

beforeEach(resetState);

describe("our own per-IP rate limiter (120 requests / minute)", () => {
  test("a burst of concurrent requests is cut off at the limit with a JSON 429", async () => {
    const app = createApp(); // default limit = 120
    const server = app.listen(0);

    try {
      const TOTAL = 130;
      const responses = await Promise.all(
        Array.from({ length: TOTAL }, () => request(server).get("/health"))
      );

      const allowed = responses.filter((r) => r.status === 200);
      const blocked = responses.filter((r) => r.status === 429);

      expect(allowed).toHaveLength(120);
      expect(blocked).toHaveLength(TOTAL - 120);
      expect(blocked[0].body).toEqual({ error: true, message: "Too many requests. Please slow down." });
      // standard RateLimit-* headers are exposed so clients can back off
      expect(blocked[0].headers).toHaveProperty("ratelimit-limit");
      expect(blocked[0].headers["retry-after"]).toBeDefined();
    } finally {
      server.close();
    }
  });

  test("the limiter counts per app instance, so limits do not leak between apps", async () => {
    const a = createApp({ rateLimitMax: 2 });
    const b = createApp({ rateLimitMax: 2 });

    await request(a).get("/health");
    await request(a).get("/health");
    expect((await request(a).get("/health")).status).toBe(429);
    expect((await request(b).get("/health")).status).toBe(200);
  });
});