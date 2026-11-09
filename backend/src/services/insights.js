const cache = require("./cache");
const { githubClient, parseGitHubError, getUser } = require("./github");
const { countViaPagination } = require("./compare");

const PER_PAGE = 100;
const MAX_PAGES = 3; // hard cap: 300 repos
const ACTIVE_DAYS = 90;
const ACTIVE_CANDIDATES = 6;

const STAR_BUCKETS = [
  { label: "0", min: 0, max: 0 },
  { label: "1–9", min: 1, max: 9 },
  { label: "10–49", min: 10, max: 49 },
  { label: "50–199", min: 50, max: 199 },
  { label: "200+", min: 200, max: Infinity },
];

/* ── Pure transformations (easy to unit test) ─────────────────────────────── */

/** Repos per primary language. Top N, tail folded into "Other". */
function languageCounts(repos, limit = 8) {
  const counts = {};
  for (const r of repos) {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  }
  const sorted = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, d) => s + d.count, 0);
  if (rest > 0) top.push({ name: "Other", count: rest });
  return top;
}

/** Repos created per year + running total. Gap years are filled with 0. */
function growthByYear(repos) {
  if (repos.length === 0) return [];
  const perYear = {};
  for (const r of repos) {
    const y = new Date(r.created_at).getFullYear();
    perYear[y] = (perYear[y] || 0) + 1;
  }
  const start = Math.min(...Object.keys(perYear).map(Number));
  const end = new Date().getFullYear();
  let total = 0;
  const out = [];
  for (let y = start; y <= end; y++) {
    const created = perYear[y] || 0;
    total += created;
    out.push({ year: String(y), created, total });
  }
  return out;
}

function starDistribution(repos) {
  return STAR_BUCKETS.map(({ label, min, max }) => ({
    label,
    count: repos.filter((r) => r.stargazers_count >= min && r.stargazers_count <= max).length,
  }));
}

function topStarred(repos, n = 3) {
  return [...repos]
    .filter((r) => r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, n)
    .map((r) => ({ name: r.name, stars: r.stargazers_count, htmlUrl: r.html_url }));
}

/* ── Needs extra API calls ────────────────────────────────────────────────── */

/**
 * "Active" = commits in the last 90 days (any author, default branch).
 * Only the most recently pushed repos are checked, to cap API calls.
 */
async function mostActive(username, repos) {
  const sinceMs = Date.now() - ACTIVE_DAYS * 86_400_000;
  const candidates = repos
    .filter((r) => new Date(r.pushed_at).getTime() >= sinceMs)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, ACTIVE_CANDIDATES);

  const since = new Date(sinceMs).toISOString();
  const counted = await Promise.all(
    candidates.map(async (r) => ({
      name: r.name,
      htmlUrl: r.html_url,
      pushedAt: r.pushed_at,
      commits: (await countViaPagination(`/repos/${username}/${r.name}/commits`, { since })) ?? 0,
    }))
  );
  return counted.filter((r) => r.commits > 0).sort((a, b) => b.commits - a.commits);
}

async function fetchAllRepos(username, publicRepos) {
  const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(publicRepos / PER_PAGE)));
  const requests = Array.from({ length: pages }, (_, i) =>
    githubClient
      .get(`/users/${username}/repos`, {
        params: { per_page: PER_PAGE, page: i + 1, type: "owner", sort: "pushed" },
      })
      .then((res) => res.data)
      .catch((err) => {
        throw parseGitHubError(err);
      })
  );
  return (await Promise.all(requests)).flat();
}

async function getInsights(username) {
  const key = `insights:${username.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  const { data: user } = await getUser(username); // cached; throws parsed 404 etc.
  const all = await fetchAllRepos(username, user.public_repos);
  const original = all.filter((r) => !r.fork); // forks would skew every metric

  const data = {
    summary: {
      publicRepos: user.public_repos,
      analysed: all.length,
      original: original.length,
      forks: all.length - original.length,
      totalStars: original.reduce((s, r) => s + r.stargazers_count, 0),
      truncated: user.public_repos > MAX_PAGES * PER_PAGE,
    },
    languages: languageCounts(original),
    growth: growthByYear(original),
    starDistribution: starDistribution(original),
    topStarred: topStarred(original),
    activeRepos: await mostActive(username, original),
    activeDays: ACTIVE_DAYS,
  };

  cache.set(key, data);
  return { data, fromCache: false };
}

module.exports = { getInsights, languageCounts, growthByYear, starDistribution };