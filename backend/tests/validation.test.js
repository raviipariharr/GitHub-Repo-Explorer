const request = require("supertest");
const { makeApp, githubGet, mockGitHub, resetState, ok, ghUser } = require("./helpers");

const app = makeApp();
beforeEach(resetState);

describe("username validation", () => {
  const invalidNames = [
    ["leading hyphen", "-abc"],
    ["trailing hyphen", "abc-"],
    ["double hyphen at start", "--bad"],
    ["underscore", "a_b"],
    ["dot", "bad.name"],
    ["space", "a b"],
    ["40 characters (max is 39)", "a".repeat(40)],
    ["HTML", "<script>alert(1)</script>"],
  ];

  describe.each([
    ["profile", (u) => `/api/users/${u}`],
    ["repos", (u) => `/api/users/${u}/repos`],
    ["language-stats", (u) => `/api/users/${u}/language-stats`],
    ["insights", (u) => `/api/users/${u}/insights`],
    ["repo languages", (u) => `/api/users/${u}/repos/hello/languages`],
  ])("GET %s", (_label, path) => {
    test.each(invalidNames)("rejects %s with 422 and never calls GitHub", async (_why, name) => {
      const res = await request(app).get(path(encodeURIComponent(name)));

      expect(res.status).toBe(422);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.error).toBe(true);
      expect(typeof res.body.message).toBe("string");
      expect(githubGet).not.toHaveBeenCalled();
    });
  });

  test("422 message on the profile route names the bad username", async () => {
    const res = await request(app).get("/api/users/--bad");
    expect(res.body).toEqual({
      error: true,
      message: '"--bad" is not a valid GitHub username.',
    });
  });

  test.each([
    ["1 character", "a"],
    ["hyphen in the middle", "octo-cat"],
    ["digits only", "123"],
    ["exactly 39 characters", "a".repeat(39)],
  ])("accepts %s", async (_why, name) => {
    mockGitHub([[`/users/${name}`, ok(ghUser(name))]]);
    const res = await request(app).get(`/api/users/${name}`);
    expect(res.status).toBe(200);
    expect(res.body.login).toBe(name);
  });
});

describe("repo name validation on the languages route", () => {
  test.each([
    ["encoded dot-dot (path traversal)", "%2E%2E"],
    ["single dot", "."],
    ["space", "bad%20repo"],
    ["101 characters (max is 100)", "a".repeat(101)],
    ["query-string injection", "x%3Fper_page%3D100"],
  ])("rejects %s with 422 and never calls GitHub", async (_why, repo) => {
    const res = await request(app).get(`/api/users/octocat/repos/${repo}/languages`);
    expect(res.status).toBe(422);
    expect(githubGet).not.toHaveBeenCalled();
  });

  test("accepts normal repo names, including dots, underscores and hyphens", async () => {
    mockGitHub([[/\/repos\/octocat\/my\.repo_name-1\/languages$/, ok({ JavaScript: 10 })]]);
    const res = await request(app).get("/api/users/octocat/repos/my.repo_name-1/languages");
    expect(res.status).toBe(200);
  });
});

describe("repos query params are sanitised before reaching GitHub", () => {
  test("bad page / sort / direction fall back to safe defaults", async () => {
    mockGitHub([[/\/users\/octocat\/repos$/, ok([], {})]]);

    const res = await request(app).get(
      "/api/users/octocat/repos?page=-5&sort=DROP%20TABLE&direction=sideways"
    );

    expect(res.status).toBe(200);
    const params = githubGet.mock.calls[0][1].params;
    expect(params).toMatchObject({ page: 1, sort: "updated", direction: "desc" });
  });

  test("valid values are passed through", async () => {
    mockGitHub([[/\/users\/octocat\/repos$/, ok([], {})]]);
    await request(app).get("/api/users/octocat/repos?page=3&sort=stars&direction=asc");
    expect(githubGet.mock.calls[0][1].params).toMatchObject({ page: 3, sort: "stars", direction: "asc" });
  });
});

describe("compare input validation", () => {
  test.each([
    ["missing both", ""],
    ["missing b", "?a=facebook/react"],
    ["no slash", "?a=facebook&b=vuejs/core"],
    ["too many segments", "?a=a/b/c&b=vuejs/core"],
    ["invalid owner", "?a=-bad/repo&b=vuejs/core"],
    ["dot-dot repo", "?a=owner/..&b=vuejs/core"],
  ])("%s -> 422", async (_why, qs) => {
    const res = await request(app).get(`/api/compare${qs}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe(true);
    expect(githubGet).not.toHaveBeenCalled();
  });

  test("the same repository twice (case-insensitive) -> 422", async () => {
    const res = await request(app).get("/api/compare?a=Facebook/React&b=facebook/react");
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/different/i);
  });
});

describe("discover input validation", () => {
  test.each([
    ["neither q nor similarTo", ""],
    ["both q and similarTo", "?q=react&similarTo=facebook/react"],
    ["q longer than 60 chars", `?q=${"a".repeat(61)}`],
    ["q with no usable terms", "?q=!!!%20***"],
    ["language with illegal characters", "?q=react&language=%3Cscript%3E"],
    ["similarTo not owner/repo", "?similarTo=justaname"],
  ])("%s -> 422", async (_why, qs) => {
    const res = await request(app).get(`/api/discover${qs}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe(true);
    expect(githubGet).not.toHaveBeenCalled();
  });
});

describe("readme input validation", () => {
  test.each([
    ["invalid owner", "/api/repos/-bad/repo/readme"],
    ["encoded dot-dot as repo (path traversal)", "/api/repos/octocat/%2E%2E/readme"],
    ["repo with illegal characters", "/api/repos/octocat/bad%20repo/readme"],
  ])("%s -> 422 and GitHub is never called", async (_why, path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(422);
    expect(githubGet).not.toHaveBeenCalled();
  });
});