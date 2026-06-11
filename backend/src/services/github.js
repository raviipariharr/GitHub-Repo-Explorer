const axios = require("axios");
const cache = require("./cache");

const GITHUB_API = "https://api.github.com";
const PER_PAGE = 10;

const githubClient = axios.create({
  baseURL: GITHUB_API,
  timeout: 10_000,
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
});

/**
 * Normalise GitHub API errors into a consistent shape.
 */
function parseGitHubError(error) {
  if (error.response) {
    const { status, data, headers } = error.response;

    if (status === 404) {
      return { status: 404, message: "GitHub user not found." };
    }

    if (status === 403) {
      const resetAt = headers["x-ratelimit-reset"];
      const resetTime = resetAt
        ? new Date(resetAt * 1000).toISOString()
        : null;
      return {
        status: 429,
        message: "GitHub API rate limit exceeded. Please try again later.",
        resetAt: resetTime,
      };
    }

    if (status === 422) {
      return { status: 422, message: "Invalid username format." };
    }

    return {
      status,
      message: data?.message || "GitHub API returned an error.",
    };
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return { status: 504, message: "Request to GitHub timed out." };
  }

  return { status: 502, message: "Could not reach GitHub API." };
}

/**
 * Fetch a user's public profile.
 */
async function getUser(username) {
  const cacheKey = `user:${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  try {
    const { data } = await githubClient.get(`/users/${username}`);
    const user = {
      login: data.login,
      name: data.name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      followers: data.followers,
      following: data.following,
      public_repos: data.public_repos,
      location: data.location,
      company: data.company,
      blog: data.blog,
      twitter_username: data.twitter_username,
      created_at: data.created_at,
    };
    cache.set(cacheKey, user);
    return { data: user, fromCache: false };
  } catch (err) {
    throw parseGitHubError(err);
  }
}

/**
 * Fetch a page of a user's public repositories.
 */
async function getRepos(username, { page = 1, sort = "updated", direction = "desc" } = {}) {
  const cacheKey = `repos:${username.toLowerCase()}:${sort}:${direction}:${page}`;
  const cached = cache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  try {
    const { data, headers } = await githubClient.get(`/users/${username}/repos`, {
      params: {
        sort,          // stars | full_name | created | updated | pushed
        direction,
        per_page: PER_PAGE,
        page,
        type: "public",
      },
    });

    // Parse Link header for hasMore
    const linkHeader = headers["link"] || "";
    const hasMore = linkHeader.includes('rel="next"');

    const repos = data.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      open_issues_count: r.open_issues_count,
      watchers_count: r.watchers_count,
      updated_at: r.updated_at,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      topics: r.topics,
      visibility: r.visibility,
      default_branch: r.default_branch,
      license: r.license?.spdx_id || null,
      is_fork: r.fork,
      homepage: r.homepage,
      size: r.size,
    }));

    const result = { repos, hasMore, page, perPage: PER_PAGE };
    cache.set(cacheKey, result);
    return { data: result, fromCache: false };
  } catch (err) {
    throw parseGitHubError(err);
  }
}

/**
 * Fetch language breakdown for a single repository.
 */
async function getRepoLanguages(username, repoName) {
  const cacheKey = `languages:${username.toLowerCase()}:${repoName}`;
  const cached = cache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  try {
    const { data } = await githubClient.get(`/repos/${username}/${repoName}/languages`);
    cache.set(cacheKey, data);
    return { data, fromCache: false };
  } catch (err) {
    throw parseGitHubError(err);
  }
}

/**
 * Fetch all repos (up to 100) to compute language stats for the chart.
 * We cache aggressively since this is expensive.
 */
async function getAllRepoLanguages(username) {
  const cacheKey = `langstats:${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  try {
    // Fetch up to 3 pages (30 repos) for language statistics
    const requests = [1, 2, 3].map((page) =>
      githubClient
        .get(`/users/${username}/repos`, {
          params: { per_page: 30, page, type: "public", sort: "pushed" },
        })
        .then((r) => r.data)
        .catch(() => [])
    );

    const pages = await Promise.all(requests);
    const allRepos = pages.flat();

    // Sum up bytes per language
    const stats = {};
    for (const repo of allRepos) {
      if (repo.language) {
        stats[repo.language] = (stats[repo.language] || 0) + (repo.size || 1);
      }
    }

    cache.set(cacheKey, stats);
    return { data: stats, fromCache: false };
  } catch (err) {
    throw parseGitHubError(err);
  }
}

module.exports = { getUser, getRepos, getRepoLanguages, getAllRepoLanguages };