const request = require("supertest");
const {
  makeApp, githubGet, mockGitHub, resetState, ok, ghUser, ghRepo,
} = require("./helpers");

const app = makeApp();
let now;

beforeEach(() => {
  resetState();
  now = 1_700_000_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

describe("X-Cache: HIT / MISS through the API", () => {
  beforeEach(() => mockGitHub([["/users/octocat", ok(ghUser("octocat"))]]));

  test("first request MISS, second request HIT, GitHub called once", async () => {
    const first = await request(app).get("/api/users/octocat");
    const second = await request(app).get("/api/users/octocat");

    expect(first.status).toBe(200);
    expect(first.headers["x-cache"]).toBe("MISS");
    expect(second.headers["x-cache"]).toBe("HIT");
    expect(second.body).toEqual(first.body);
    expect(githubGet).toHaveBeenCalledTimes(1);
  });

  test("entry expires after the 60s TTL, then GitHub is called again", async () => {
    await request(app).get("/api/users/octocat");

    now += 59_000;
    expect((await request(app).get("/api/users/octocat")).headers["x-cache"]).toBe("HIT");

    now += 2_000; // 61s after the original fetch
    expect((await request(app).get("/api/users/octocat")).headers["x-cache"]).toBe("MISS");
    expect(githubGet).toHaveBeenCalledTimes(2);
  });

  test("usernames are case-insensitive for caching", async () => {
    await request(app).get("/api/users/octocat");
    const res = await request(app).get("/api/users/OctoCat");
    expect(res.headers["x-cache"]).toBe("HIT");
    expect(githubGet).toHaveBeenCalledTimes(1);
  });

  test("different users never share a cache entry", async () => {
    mockGitHub([
      ["/users/octocat", ok(ghUser("octocat"))],
      ["/users/hubot", ok(ghUser("hubot"))],
    ]);
    await request(app).get("/api/users/octocat");
    const other = await request(app).get("/api/users/hubot");
    expect(other.headers["x-cache"]).toBe("MISS");
    expect(other.body.login).toBe("hubot");
  });
});

describe("repo list cache keys include page, sort and direction", () => {
  beforeEach(() => mockGitHub([[/\/users\/octocat\/repos$/, ok([ghRepo()], {})]]));

  test("same query HITs; a different page / sort / direction MISSes", async () => {
    const get = (qs) => request(app).get(`/api/users/octocat/repos${qs}`);

    expect((await get("?page=1&sort=updated&direction=desc")).headers["x-cache"]).toBe("MISS");
    expect((await get("?page=1&sort=updated&direction=desc")).headers["x-cache"]).toBe("HIT");
    expect((await get("?page=2&sort=updated&direction=desc")).headers["x-cache"]).toBe("MISS");
    expect((await get("?page=1&sort=stars&direction=desc")).headers["x-cache"]).toBe("MISS");
    expect((await get("?page=1&sort=updated&direction=asc")).headers["x-cache"]).toBe("MISS");
    expect(githubGet).toHaveBeenCalledTimes(4);
  });
});

describe("other cached endpoints", () => {
  test("README: MISS then HIT", async () => {
    mockGitHub([[
      "/repos/octocat/hello/readme",
      ok({
        name: "README.md", path: "README.md", encoding: "base64",
        content: Buffer.from("# hi").toString("base64"),
        html_url: "https://github.com/octocat/hello/blob/main/README.md",
        download_url: "https://raw.githubusercontent.com/octocat/hello/main/README.md",
      }),
    ]]);
    const a = await request(app).get("/api/repos/octocat/hello/readme");
    const b = await request(app).get("/api/repos/octocat/hello/readme");
    expect([a.headers["x-cache"], b.headers["x-cache"]]).toEqual(["MISS", "HIT"]);
    expect(githubGet).toHaveBeenCalledTimes(1);
  });

  test("discover: MISS then HIT without repeating the searches", async () => {
    mockGitHub([["/search/repositories", ok({ items: [ghRepo()] })]]);
    const a = await request(app).get("/api/discover?q=react");
    const callsAfterFirst = githubGet.mock.calls.length;
    const b = await request(app).get("/api/discover?q=react");

    expect([a.headers["x-cache"], b.headers["x-cache"]]).toEqual(["MISS", "HIT"]);
    expect(githubGet).toHaveBeenCalledTimes(callsAfterFirst);
  });

  test("insights: MISS then HIT", async () => {
    mockGitHub([
      ["/users/octocat", ok(ghUser("octocat", { public_repos: 1 }))],
      [/\/users\/octocat\/repos$/, ok([ghRepo({ pushed_at: "2020-01-01T00:00:00Z" })])],
    ]);
    const a = await request(app).get("/api/users/octocat/insights");
    const b = await request(app).get("/api/users/octocat/insights");
    expect([a.headers["x-cache"], b.headers["x-cache"]]).toEqual(["MISS", "HIT"]);
  });

  test("compare currently sends no X-Cache header (documented in the README)", async () => {
    mockGitHub([
      [/\/repos\/[^/]+\/[^/]+$/, (m) => ok(ghRepo({ full_name: m[0].replace("/repos/", "") }))],
      [/\/(contributors|commits)$/, ok([])],
    ]);
    const res = await request(app).get("/api/compare?a=facebook/react&b=vuejs/core");
    expect(res.status).toBe(200);
    expect(res.headers["x-cache"]).toBeUndefined();
  });
});