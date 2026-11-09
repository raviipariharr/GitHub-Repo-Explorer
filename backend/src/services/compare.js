const cache = require("./cache");
const { githubClient, parseGitHubError } = require("./github");

/**
 * GitHub has no "count" endpoint for commits or contributors.
 * Trick: request 1 item per page, then read the page number of rel="last"
 * from the Link header. That number IS the total count.
 * No Link header => everything fits on one page => count = data.length.
 */
function lastPageFromLink(link) {
  const m = /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(link || "");
  return m ? parseInt(m[1], 10) : null;
}

async function countViaPagination(url, params = {}) {
  try {
    const res = await githubClient.get(url, { params: { ...params, per_page: 1 } });
    return lastPageFromLink(res.headers.link) ?? res.data.length;
  } catch {
    // Empty repo (409), contributor list too large (403), etc.
    // "Where available" => null, and the UI shows N/A.
    return null;
  }
}

async function fetchSnapshot(owner, repo) {
  const key = `compare:${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let meta;
  try {
    ({ data: meta } = await githubClient.get(`/repos/${owner}/${repo}`));
  } catch (err) {
    if (err.response?.status === 404) {
      throw { status: 404, message: `Repository "${owner}/${repo}" not found.` };
    }
    throw parseGitHubError(err);
  }

  // The two counts are independent -> run in parallel
  const [contributors, commits] = await Promise.all([
    countViaPagination(`/repos/${owner}/${repo}/contributors`, { anon: "true" }),
    countViaPagination(`/repos/${owner}/${repo}/commits`),
  ]);

  const snapshot = {
    fullName: meta.full_name,
    htmlUrl: meta.html_url,
    stars: meta.stargazers_count,
    forks: meta.forks_count,
    openIssues: meta.open_issues_count, // GitHub counts open PRs in this number too
    contributors,
    language: meta.language,
    lastUpdated: meta.pushed_at, // last push; updated_at also changes on stars/issues
    license: meta.license?.spdx_id || null,
    commits,
  };

  cache.set(key, snapshot);
  return snapshot;
}

async function compareRepos(a, b) {
  // 2 repos x (1 + 2) calls = 6 GitHub requests, all concurrent per repo
  const [left, right] = await Promise.all([
    fetchSnapshot(a.owner, a.repo),
    fetchSnapshot(b.owner, b.repo),
  ]);
  return { left, right };
}

module.exports = { compareRepos, countViaPagination };