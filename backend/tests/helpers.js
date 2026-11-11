const axios = require("axios"); // resolves to __mocks__/axios.js under Jest
const cache = require("../src/services/cache");
const { createApp } = require("../src/app");

const githubGet = axios.__client.get;

/* ── Fake GitHub responses ─────────────────────────────────────────────── */

/** Mimics an axios error for a non-2xx HTTP response. */
function httpError(status, { data = {}, headers = {} } = {}) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status, data, headers };
  return err;
}

/** Mimics an axios error with no response (timeout, DNS, connection reset). */
function networkError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

const ok = (data, headers = {}) => ({ data, headers });

const ghUser = (login = "octocat", extra = {}) => ({
  login,
  name: "The Octocat",
  bio: "hello",
  avatar_url: `https://avatars.example/${login}.png`,
  html_url: `https://github.com/${login}`,
  followers: 10,
  following: 1,
  public_repos: 3,
  location: "SF",
  company: "GitHub",
  blog: "",
  twitter_username: null,
  created_at: "2011-01-25T18:44:36Z",
  ...extra,
});

let nextId = 1;
const ghRepo = (over = {}) => {
  const id = over.id ?? nextId++;
  const name = over.name ?? `repo-${id}`;
  return {
    id,
    name,
    full_name: `octocat/${name}`,
    description: "A repo",
    html_url: `https://github.com/octocat/${name}`,
    language: "JavaScript",
    stargazers_count: 5,
    forks_count: 1,
    open_issues_count: 0,
    watchers_count: 5,
    updated_at: "2026-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: new Date().toISOString(),
    topics: ["react"],
    visibility: "public",
    default_branch: "main",
    license: { spdx_id: "MIT" },
    fork: false,
    archived: false,
    homepage: null,
    size: 100,
    ...over,
  };
};

/**
 * Route-table mock for the GitHub client.
 * routes: [[pathOrRegExp, responseOrFn], ...]  (first match wins)
 * A handler may return a response, throw, or return an Error (which is thrown).
 * Any URL with no matching route fails loudly so tests never pass by accident.
 */
function mockGitHub(routes) {
  githubGet.mockImplementation(async (url, config = {}) => {
    for (const [pattern, handler] of routes) {
      const match = pattern instanceof RegExp ? pattern.exec(url) : pattern === url ? [url] : null;
      if (!match) continue;
      const result = typeof handler === "function" ? await handler(match, config) : handler;
      if (result instanceof Error) throw result;
      return result;
    }
    throw new Error(`Unmocked GitHub call: ${url}`);
  });
}

/* ── Test lifecycle helpers ────────────────────────────────────────────── */

/** Call in beforeEach: empty the cache and forget every mocked GitHub call. */
function resetState() {
  githubGet.mockReset();
  cache.store.clear();
}

/** Fresh app with a generous limiter so it never interferes with feature tests. */
const makeApp = () => createApp({ rateLimitMax: 100_000 });

module.exports = {
  githubGet,
  cache,
  createApp,
  makeApp,
  mockGitHub,
  resetState,
  httpError,
  networkError,
  ok,
  ghUser,
  ghRepo,
};