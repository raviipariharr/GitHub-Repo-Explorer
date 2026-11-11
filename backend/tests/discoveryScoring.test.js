const request = require("supertest");
const { scoreRepo, rank } = require("../src/services/discovery");
const { makeApp, githubGet, mockGitHub, resetState, ok, ghRepo } = require("./helpers");

const NOW = Date.parse("2026-06-01T00:00:00Z");
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();

const repo = (over = {}) => ({
  id: 1,
  topics: ["react", "ui"],
  language: "JavaScript",
  stargazers_count: 0,
  pushed_at: daysAgo(3650), // ~10 years: recency is effectively 0
  ...over,
});
const profile = (over = {}) => ({ topics: ["react", "ui"], language: "JavaScript", ...over });

describe("scoreRepo", () => {
  test("a perfect match (all topics, same language, huge stars, pushed now) scores 100", () => {
    const r = scoreRepo(repo({ stargazers_count: 500_000, pushed_at: daysAgo(0) }), profile(), NOW);
    expect(r.score).toBe(100);
    expect(r.breakdown).toEqual({ topics: 100, language: 100, stars: 100, recency: 100 });
  });

  test("no topic overlap, other language, no stars, ancient repo scores 0", () => {
    const r = scoreRepo(repo({ topics: ["cooking"], language: "Go" }), profile(), NOW);
    expect(r.score).toBe(0);
  });

  test("topic overlap is the share of the PROFILE's topics the repo covers (weight 40%)", () => {
    const half = scoreRepo(repo({ topics: ["react"], language: "Go" }), profile(), NOW);
    expect(half.breakdown.topics).toBe(50);
    expect(half.score).toBe(20); // 0.5 * 0.40
    expect(half.sharedTopics).toEqual(["react"]);
  });

  test("language match is worth 20 points", () => {
    const same = scoreRepo(repo({ topics: [] }), profile(), NOW);
    const diff = scoreRepo(repo({ topics: [], language: "Go" }), profile(), NOW);
    expect(same.score - diff.score).toBe(20);
  });

  test("without a profile language, that weight is dropped and the rest renormalised", () => {
    // topics 1.0*0.40 / (0.40+0.25+0.15) = 0.5
    const r = scoreRepo(repo({ pushed_at: daysAgo(3650) }), profile({ language: null }), NOW);
    expect(r.score).toBe(50);
  });

  test("stars use a log scale: 50k vs 60k barely matters, 10 vs 1000 matters a lot", () => {
    const at = (stars) => scoreRepo(repo({ topics: [], language: "Go", stargazers_count: stars }), profile(), NOW).score;
    expect(Math.abs(at(60_000) - at(50_000))).toBeLessThanOrEqual(1);
    expect(at(1000) - at(10)).toBeGreaterThanOrEqual(9);
  });

  test("recency halves every 180 days", () => {
    const rec = (d) => scoreRepo(repo({ pushed_at: daysAgo(d) }), profile(), NOW).breakdown.recency;
    expect(rec(0)).toBe(100);
    expect(rec(180)).toBe(50);
    expect(rec(360)).toBe(25);
  });

  test("a pushed_at in the future is treated as 'just pushed', not a score above 100", () => {
    const r = scoreRepo(repo({ pushed_at: daysAgo(-30), stargazers_count: 500_000 }), profile(), NOW);
    expect(r.breakdown.recency).toBe(100);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  test("topic matching ignores case, and a repo with no topics array is handled", () => {
    expect(scoreRepo(repo({ topics: ["React", "UI"] }), profile(), NOW).breakdown.topics).toBe(100);
    expect(scoreRepo(repo({ topics: undefined }), profile(), NOW).breakdown.topics).toBe(0);
  });

  test("an empty profile never divides by zero", () => {
    const r = scoreRepo(repo(), { topics: [], language: null }, NOW);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  test("every breakdown value is an integer from 0 to 100", () => {
    const { breakdown } = scoreRepo(repo({ stargazers_count: 1234, pushed_at: daysAgo(77) }), profile(), NOW);
    Object.values(breakdown).forEach((v) => {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});

describe("rank", () => {
  beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  const raw = (over) => ({
    id: 1, full_name: "o/r", description: "d", html_url: "u", language: "JavaScript",
    stargazers_count: 10, forks_count: 1, topics: ["react", "ui"],
    pushed_at: daysAgo(1), license: { spdx_id: "MIT" }, archived: false, ...over,
  });

  test("topic match beats raw popularity", () => {
    const relevant = raw({ id: 1, full_name: "o/relevant", stargazers_count: 100 });
    const famous = raw({ id: 2, full_name: "o/famous", stargazers_count: 200_000, topics: ["unrelated"] });
    const out = rank([famous, relevant], profile(), null);
    expect(out.map((r) => r.fullName)).toEqual(["o/relevant", "o/famous"]);
  });

  test("when topics tie, a fresh small repo beats a stale star-heavy one", () => {
    const fresh = raw({ id: 1, full_name: "o/fresh", stargazers_count: 500, pushed_at: daysAgo(5) });
    const stale = raw({ id: 2, full_name: "o/stale", stargazers_count: 50_000, pushed_at: daysAgo(700) });
    expect(rank([stale, fresh], profile(), null)[0].fullName).toBe("o/fresh");
  });

  test("excludes the seed repository itself and archived repositories", () => {
    const out = rank(
      [raw({ id: 1, full_name: "o/seed" }), raw({ id: 2, full_name: "o/old", archived: true }), raw({ id: 3, full_name: "o/keep" })],
      profile(),
      1
    );
    expect(out.map((r) => r.fullName)).toEqual(["o/keep"]);
  });

  test("de-duplicates repos returned by more than one search", () => {
    const out = rank([raw({ id: 7 }), raw({ id: 7 }), raw({ id: 8, full_name: "o/other" })], profile(), null);
    expect(out).toHaveLength(2);
  });

  test("equal scores are ordered by stars, and results are capped at 20", () => {
    const many = Array.from({ length: 30 }, (_, i) => raw({ id: i + 1, full_name: `o/r${i}`, stargazers_count: 10 }));
    expect(rank(many, profile(), null)).toHaveLength(20);

    const tie = rank(
      [raw({ id: 1, full_name: "o/a", stargazers_count: 100 }), raw({ id: 2, full_name: "o/b", stargazers_count: 101, pushed_at: daysAgo(1) })],
      profile({ language: null, topics: [] }), null
    );
    expect(tie[0].score).toBeGreaterThanOrEqual(tie[1].score);
  });

  test("maps GitHub fields to the API shape and includes score details", () => {
    const [r] = rank([raw({ id: 9, full_name: "o/shape" })], profile(), null);
    expect(r).toMatchObject({
      id: 9, fullName: "o/shape", htmlUrl: "u", stars: 10, forks: 1, license: "MIT",
      language: "JavaScript", sharedTopics: ["react", "ui"],
    });
    expect(r.score).toEqual(expect.any(Number));
    expect(Object.keys(r.breakdown).sort()).toEqual(["language", "recency", "stars", "topics"]);
  });
});

describe("GET /api/discover (end to end, GitHub mocked)", () => {
  const app = makeApp();
  beforeEach(resetState);

  test("keyword search: sends safe qualifiers, ranks by score, de-duplicates across searches", async () => {
    const strong = ghRepo({ id: 1, name: "strong", topics: ["react"], stargazers_count: 5000 });
    const weak = ghRepo({ id: 2, name: "weak", topics: ["misc"], stargazers_count: 20 });
    mockGitHub([["/search/repositories", ok({ items: [weak, strong, strong] })]]);

    const res = await request(app).get("/api/discover?q=react&language=Python");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("keyword");
    expect(res.body.results.map((r) => r.id)).toEqual([1, 2]);

    const queries = githubGet.mock.calls.map((c) => c[1].params.q);
    expect(githubGet).toHaveBeenCalledTimes(2); // text search + topic:react
    queries.forEach((q) => {
      expect(q).toContain("stars:>=10");
      expect(q).toContain("fork:false");
      expect(q).toContain("archived:false");
      expect(q).toContain('language:"Python"');
    });
    expect(queries.some((q) => q.startsWith("topic:react"))).toBe(true);
  });

  test("similarTo: searches by the seed's topics and never recommends the seed", async () => {
    mockGitHub([
      ["/repos/facebook/react", ok(ghRepo({ id: 99, full_name: "facebook/react", topics: ["react", "ui", "frontend", "js"], language: "JavaScript" }))],
      ["/search/repositories", ok({ items: [ghRepo({ id: 99, name: "react" }), ghRepo({ id: 5, name: "preact", topics: ["react", "ui"] })] })],
    ]);

    const res = await request(app).get("/api/discover?similarTo=facebook/react");

    expect(res.status).toBe(200);
    expect(res.body.seed).toBe("facebook/react");
    expect(res.body.results.map((r) => r.id)).toEqual([5]);
    // 1 repo lookup + searches for only the first 3 topics
    expect(githubGet).toHaveBeenCalledTimes(4);
  });
});