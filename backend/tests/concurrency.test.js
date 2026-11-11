const request = require("supertest");
const {
  makeApp, githubGet, mockGitHub, resetState, httpError, ok, ghUser, ghRepo,
} = require("./helpers");

const app = makeApp();
beforeEach(resetState);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe("concurrent requests to the API", () => {
  test("20 parallel requests for 20 different users each get their own data (no cross-talk)", async () => {
    mockGitHub([
      [/^\/users\/(user\d+)$/, async (m) => {
        await sleep(Math.random() * 20); // out-of-order completion
        return ok(ghUser(m[1]));
      }],
    ]);

    const names = Array.from({ length: 20 }, (_, i) => `user${i}`);
    const responses = await Promise.all(names.map((n) => request(app).get(`/api/users/${n}`)));

    responses.forEach((res, i) => {
      expect(res.status).toBe(200);
      expect(res.body.login).toBe(names[i]);
      expect(res.headers["x-cache"]).toBe("MISS");
    });
    expect(githubGet).toHaveBeenCalledTimes(20);
  });

  test("a mix of success, not-found and rate-limit responses each resolve independently", async () => {
    mockGitHub([
      ["/users/good", ok(ghUser("good"))],
      ["/users/ghost", httpError(404)],
      ["/users/limited", httpError(403, { headers: { "x-ratelimit-reset": "1900000000" } })],
    ]);

    const [good, ghost, limited, good2] = await Promise.all([
      request(app).get("/api/users/good"),
      request(app).get("/api/users/ghost"),
      request(app).get("/api/users/limited"),
      request(app).get("/api/users/good"),
    ]);

    expect(good.status).toBe(200);
    expect(ghost.status).toBe(404);
    expect(limited.status).toBe(429);
    expect(good2.status).toBe(200);

    // failures are not cached; the success is
    expect((await request(app).get("/api/users/good")).headers["x-cache"]).toBe("HIT");
    expect((await request(app).get("/api/users/ghost")).headers["x-cache"]).toBeUndefined();
  });

  test("simultaneous identical requests all succeed with identical bodies", async () => {
    mockGitHub([["/users/octocat", async () => { await sleep(15); return ok(ghUser("octocat")); }]]);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(app).get("/api/users/octocat"))
    );

    responses.forEach((r) => expect(r.status).toBe(200));
    const bodies = new Set(responses.map((r) => JSON.stringify(r.body)));
    expect(bodies.size).toBe(1);

    // once the burst has settled, the entry is served from cache
    const after = await request(app).get("/api/users/octocat");
    expect(after.headers["x-cache"]).toBe("HIT");
  });

  // Known gap: requests that arrive before the first one finishes each hit GitHub
  // (cache stampede). Turn this into a real test after adding in-flight de-duplication.
  test.todo("simultaneous identical requests trigger only ONE upstream GitHub call");
});

describe("a single request fans out to GitHub in parallel", () => {
  /** Wraps a handler so we can see how many GitHub calls were in flight at once. */
  function withInFlightTracking(handler) {
    const stats = { current: 0, max: 0 };
    const fn = async (...args) => {
      stats.current += 1;
      stats.max = Math.max(stats.max, stats.current);
      await sleep(25);
      try {
        return await handler(...args);
      } finally {
        stats.current -= 1;
      }
    };
    return { stats, fn };
  }

  test("compare: both repos AND their commit/contributor counts are fetched concurrently", async () => {
    const tracked = withInFlightTracking((url) =>
      /\/(contributors|commits)$/.test(url) ? ok([]) : ok(ghRepo({ full_name: url.replace("/repos/", "") }))
    );
    githubGet.mockImplementation((url) => tracked.fn(url));

    const res = await request(app).get("/api/compare?a=facebook/react&b=vuejs/core");

    expect(res.status).toBe(200);
    // 2 repo lookups, then 2 repos x 2 counts. Sequential code would never exceed 1.
    expect(tracked.stats.max).toBeGreaterThanOrEqual(4);
    expect(githubGet).toHaveBeenCalledTimes(6);
  });

  test("insights: commit counts for the most active repos are fetched concurrently", async () => {
    const recent = new Date().toISOString();
    const repos = Array.from({ length: 6 }, (_, i) => ghRepo({ name: `r${i}`, pushed_at: recent }));
    const commits = withInFlightTracking(() =>
      ok([{}], { link: '<https://x/c?per_page=1&page=7>; rel="last"' })
    );

    mockGitHub([
      ["/users/octocat", ok(ghUser("octocat", { public_repos: 6 }))],
      [/\/users\/octocat\/repos$/, ok(repos)],
      [/\/commits$/, commits.fn],
    ]);

    const res = await request(app).get("/api/users/octocat/insights");

    expect(res.status).toBe(200);
    expect(commits.stats.max).toBe(6);
    expect(res.body.activeRepos).toHaveLength(6);
    expect(res.body.activeRepos.every((r) => r.commits === 7)).toBe(true);
  });
});