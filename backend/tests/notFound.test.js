const request = require("supertest");
const {
  makeApp, githubGet, mockGitHub, resetState, httpError, ok, ghUser, ghRepo,
} = require("./helpers");

const app = makeApp();
beforeEach(resetState);

const notFound = () => httpError(404, { data: { message: "Not Found" } });

describe("user not found", () => {
  test("profile -> 404 with a readable message", async () => {
    mockGitHub([["/users/ghost", notFound()]]);
    const res = await request(app).get("/api/users/ghost");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: true, message: "GitHub user not found." });
  });

  test("repos list for an unknown user -> 404", async () => {
    mockGitHub([[/\/users\/ghost\/repos$/, notFound()]]);
    const res = await request(app).get("/api/users/ghost/repos");
    expect(res.status).toBe(404);
  });

  test("a 404 is not cached: the user appearing later is served normally", async () => {
    mockGitHub([["/users/newbie", notFound()]]);
    const first = await request(app).get("/api/users/newbie");
    expect(first.status).toBe(404);

    mockGitHub([["/users/newbie", ok(ghUser("newbie"))]]);
    const second = await request(app).get("/api/users/newbie");
    expect(second.status).toBe(200);
    expect(second.headers["x-cache"]).toBe("MISS");
  });
});

describe("repository not found", () => {
  test("languages of a missing repo -> 404", async () => {
    mockGitHub([[/\/repos\/octocat\/nope\/languages$/, notFound()]]);
    const res = await request(app).get("/api/users/octocat/repos/nope/languages");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(true);
  });

  test("compare names the missing repository", async () => {
    mockGitHub([
      ["/repos/facebook/react", ok(ghRepo({ full_name: "facebook/react" }))],
      [/\/repos\/facebook\/react\/(contributors|commits)$/, ok([])],
      ["/repos/ghost/nothing", notFound()],
    ]);
    const res = await request(app).get("/api/compare?a=facebook/react&b=ghost/nothing");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Repository "ghost/nothing" not found.');
  });

  test("compare reports the first repo when it is the missing one", async () => {
    mockGitHub([
      ["/repos/ghost/nothing", notFound()],
      ["/repos/vuejs/core", ok(ghRepo({ full_name: "vuejs/core" }))],
      [/\/repos\/vuejs\/core\/(contributors|commits)$/, ok([])],
    ]);
    const res = await request(app).get("/api/compare?a=ghost/nothing&b=vuejs/core");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Repository "ghost/nothing" not found.');
  });

  test("README missing -> 404 'no README'", async () => {
    mockGitHub([["/repos/octocat/empty/readme", notFound()]]);
    const res = await request(app).get("/api/repos/octocat/empty/readme");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("This repository has no README.");
  });

  test("discover similarTo a missing repo -> 404", async () => {
    mockGitHub([["/repos/ghost/nothing", notFound()]]);
    const res = await request(app).get("/api/discover?similarTo=ghost/nothing");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Repository "ghost/nothing" not found.');
  });

  test("discover similarTo a repo with no topics -> 422 with guidance", async () => {
    mockGitHub([["/repos/octocat/plain", ok(ghRepo({ full_name: "octocat/plain", topics: [] }))]]);
    const res = await request(app).get("/api/discover?similarTo=octocat/plain");
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/no topics/i);
    // no search was attempted
    expect(githubGet).toHaveBeenCalledTimes(1);
  });
});

describe("unknown routes", () => {
  test("return a JSON 404, not an HTML page", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: true, message: "Route not found." });
  });
});