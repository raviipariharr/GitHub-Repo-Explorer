# GitHub Explorer

A full-stack GitHub explorer built as a Full Stack Developer assessment project. Search any GitHub username to see their public profile, a paginated and sortable repository list, per-repository language breakdowns, and a developer insights dashboard. Beyond profiles, you can compare two repositories side by side, discover similar repositories through a scored recommendation list, and read any repository's README without leaving the app.

The frontend never calls the GitHub API directly. Every request goes through a Node.js/Express backend that validates input, normalises errors, and caches responses for 60 seconds to stay within GitHub's rate limits.

---

## Features

| Feature | What it does |
|---|---|
| **Profile explorer** | Avatar, bio, follower counts, links, recent-search history |
| **Repository list** | Paginated (10 per page), sortable by updated / stars / name / created, expandable detail panel with language breakdown |
| **Language statistics** | Donut / bar chart of a user's languages across their public repos |
| **Developer insights dashboard** | Most popular languages, repository growth by year, star distribution, most active repositories, public repo count |
| **Repository comparison** | Two repos side by side: stars, forks, open issues, contributors, primary language, last updated, license, commit count |
| **Smart discovery** | Keyword search or "similar to this repo", ranked by topic overlap, language, stars, and recency, with a visible score breakdown |
| **README viewer** | GitHub-style Markdown rendering, syntax highlighting, table of contents, relative image/link resolution |

---

## Live Demo Links

| | URL |
|---|---|
| Frontend | https://github-explorer-frontend-39ed.onrender.com/ |
| Backend API | https://github-explorer-backend-wi6k.onrender.com/ |

> Both services run on Render's free tier, which spins instances down after inactivity. The first request after idle time can take up to a minute while the backend wakes up.

---

## Tech Stack

### Backend

| Library | Version | Why |
|---|---|---|
| **Node.js** | ≥ 18 | Runtime — async I/O fits the proxy-heavy workload |
| **Express** | ^4.18 | Minimal, well-understood HTTP framework |
| **axios** | ^1.6 | HTTP client for GitHub API calls — timeouts, clean error objects |
| **helmet** | ^7.1 | Secure HTTP headers in one line |
| **morgan** | ^1.10 | Request logging |
| **cors** | ^2.8 | Restricts allowed origins to the frontend URL |
| **express-rate-limit** | ^7.1 | Global IP-based limiter (120 req/min) to protect the proxy |
| **nodemon** | ^3.0 | Hot reload during development |
| **dotenv** | — | Loads `GITHUB_TOKEN` and other settings from `.env` |

The cache (`src/services/cache.js`) is a plain `Map` with TTL timestamps. No Redis, no configuration, suitable for a single-instance demo server.

### Frontend

| Library | Version | Why |
|---|---|---|
| **React** | ^19 | Component model and hooks |
| **Vite** | ^8 | Fast HMR, native ESM, dev proxy. Requires Node ^20.19 or ≥ 22.12 |
| **axios** | ^1.17 | Same HTTP client as the backend, normalised error shape |
| **Recharts** | ^3.8 | Composable chart primitives (donut, bar, growth line) |
| **CSS Modules** | built-in (Vite) | Scoped styles with no runtime cost |

**README viewer libraries** (loaded lazily, only when a README is opened):

| Library | Why |
|---|---|
| **react-markdown** + **remark-gfm** | Markdown to React elements; GitHub-flavoured tables, task lists, strikethrough |
| **rehype-raw** + **rehype-sanitize** | Supports inline HTML in READMEs, then strips anything unsafe (scripts, event handlers, `javascript:` URLs) |
| **rehype-slug** | Heading ids using GitHub's slug algorithm so `#section` links and the table of contents work |
| **rehype-highlight** + **highlight.js** | Syntax highlighting for fenced code blocks |
| **github-markdown-css** | GitHub's own Markdown styling (dark theme) |

**No state management library.** `useState`, `useCallback`, and `useRef` are enough for this data flow.

---

## How to Run Locally

> **Prerequisites:** Node.js **20.19+ or 22.12+** (required by Vite 8). The backend alone runs on Node 18+.

### 1. Get the code

```bash
git clone https://github.com/raviipariharr/github-explorer.git
cd github-explorer
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The server starts at **http://localhost:4000**.

Verify it's working:
```bash
curl http://localhost:4000/health
# → {"status":"ok","uptime":3.14}

curl http://localhost:4000/api/users/torvalds
# → { "login": "torvalds", "name": "Linus Torvalds", ... }
```

**Strongly recommended: add a GitHub token.** Without one, GitHub allows only 60 requests per hour, and a single profile search can use more than a dozen of them (see [GitHub API usage](#github-api-usage)). With a token the limit is 5,000 per hour.

1. Visit https://github.com/settings/tokens → Generate new token (classic)
2. Give it any name and select **no scopes** (only public data is needed)
3. Paste the token into `backend/.env`:

```env
PORT=4000
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
FRONTEND_ORIGIN=http://localhost:5173
```

Restart the backend. You should see `GitHub token: ✅ configured`.

### 3. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173**.

> No `.env` file is needed for local development. Vite's dev server proxies `/api` requests to `:4000` (configured in `vite.config.js`).

### 4. Production build (optional)

```bash
cd frontend
npm run build      # outputs to frontend/dist/
npm run preview    # serves the built files locally
```

---

## API Documentation

All endpoints are prefixed with `/api`. All endpoints except `/api/compare` return an `X-Cache: HIT | MISS` header showing whether the result came from the 60-second in-memory cache.

**Common errors**

| Status | Condition | Body |
|---|---|---|
| `422` | Input fails validation | `{ "error": true, "message": "..." }` |
| `404` | User, repository, or README not found | `{ "error": true, "message": "GitHub user not found." }` |
| `429` | GitHub rate limit hit | `{ "error": true, "message": "GitHub API rate limit exceeded. Please try again later.", "resetAt": "2026-06-01T12:00:00.000Z" }` |
| `502` | Cannot reach GitHub | `{ "error": true, "message": "Could not reach GitHub API." }` |
| `504` | GitHub timed out | `{ "error": true, "message": "Request to GitHub timed out." }` |

Usernames must be alphanumeric plus hyphens, 1–39 characters, and cannot start or end with a hyphen. Repository names allow letters, numbers, `.`, `_`, and `-` (1–100 characters).

---

### `GET /health`

Server uptime check.

```json
{ "status": "ok", "uptime": 42.3 }
```

---

### `GET /api/users/:username`

Fetch a user's public profile.

**Response `200`** (values illustrative)
```json
{
  "login": "torvalds",
  "name": "Linus Torvalds",
  "bio": null,
  "avatar_url": "https://avatars.githubusercontent.com/u/1024025",
  "html_url": "https://github.com/torvalds",
  "followers": 200000,
  "following": 0,
  "public_repos": 9,
  "location": "Portland, OR",
  "company": "Linux Foundation",
  "blog": "",
  "twitter_username": null,
  "created_at": "2011-09-03T15:26:22Z"
}
```

---

### `GET /api/users/:username/repos`

Fetch one page (10 repositories) of a user's public repositories.

| Query param | Type | Default | Allowed values |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1 |
| `sort` | string | `updated` | `updated` · `stars` · `full_name` · `created` |
| `direction` | string | `desc` | `asc` · `desc` |

**Response `200`**
```json
{
  "repos": [
    {
      "id": 2325298,
      "name": "linux",
      "full_name": "torvalds/linux",
      "description": "Linux kernel source tree",
      "html_url": "https://github.com/torvalds/linux",
      "language": "C",
      "stargazers_count": 190000,
      "forks_count": 60000,
      "open_issues_count": 0,
      "watchers_count": 190000,
      "updated_at": "2026-06-01T10:00:00Z",
      "created_at": "2011-09-04T22:48:12Z",
      "pushed_at": "2026-06-01T09:30:00Z",
      "topics": [],
      "visibility": "public",
      "default_branch": "master",
      "license": "NOASSERTION",
      "is_fork": false,
      "homepage": null,
      "size": 5000000
    }
  ],
  "hasMore": true,
  "page": 1,
  "perPage": 10
}
```

---

### `GET /api/users/:username/repos/:repo/languages`

Language byte breakdown for a single repository. Used by the expanded repo card.

```json
{ "C": 19872872, "Python": 572312, "Shell": 132891, "Makefile": 48231 }
```

---

### `GET /api/users/:username/language-stats`

Aggregated language weights across the user's most recently pushed repositories (up to 90). Each repository contributes its size to its primary language only, so this shows relative weight, not exact code volume.

```json
{ "JavaScript": 5200, "Python": 3100, "HTML": 800 }
```

---

### `GET /api/users/:username/insights`

Everything the Developer Insights dashboard shows, computed server-side from one fetch of the user's repositories (up to 300, original repos only; forks are excluded from every metric).

```json
{
  "summary": {
    "publicRepos": 32,
    "analysed": 32,
    "original": 27,
    "forks": 5,
    "totalStars": 410,
    "truncated": false
  },
  "languages": [{ "name": "JavaScript", "count": 12 }, { "name": "Python", "count": 6 }],
  "growth": [{ "year": "2023", "created": 4, "total": 4 }, { "year": "2024", "created": 9, "total": 13 }],
  "starDistribution": [{ "label": "0", "count": 14 }, { "label": "1–9", "count": 9 }],
  "topStarred": [{ "name": "my-app", "stars": 120, "htmlUrl": "https://github.com/..." }],
  "activeRepos": [{ "name": "my-app", "commits": 41, "pushedAt": "2026-06-01T09:30:00Z", "htmlUrl": "https://github.com/..." }],
  "activeDays": 90
}
```

| Field | How it is computed |
|---|---|
| `languages` | Number of repos per primary language; top 8 plus "Other" |
| `growth` | Repos created per year with a running total; gap years are filled with 0 |
| `starDistribution` | Repos bucketed into 0 · 1–9 · 10–49 · 50–199 · 200+ stars |
| `activeRepos` | Commits in the last 90 days (any author, default branch) for the 6 most recently pushed repos |

---

### `GET /api/compare?a=owner/repo&b=owner/repo`

Compare two repositories. Both must be in `owner/repo` format and must be different.

```json
{
  "left": {
    "fullName": "facebook/react",
    "htmlUrl": "https://github.com/facebook/react",
    "stars": 230000,
    "forks": 47000,
    "openIssues": 900,
    "contributors": 1700,
    "language": "JavaScript",
    "lastUpdated": "2026-06-01T09:30:00Z",
    "license": "MIT",
    "commits": 18000
  },
  "right": { "...": "same shape" }
}
```

- `contributors` and `commits` are `null` when GitHub does not return a count (empty repository, or a contributor list too large to list). The UI shows "N/A".
- GitHub has no count endpoint for these. The backend requests one item per page and reads the page number of `rel="last"` from the `Link` header, which equals the total.
- `openIssues` is GitHub's `open_issues_count`, which includes open pull requests.
- `lastUpdated` is the last push time, not GitHub's `updated_at` (which also changes when someone stars the repo).

---

### `GET /api/discover`

Recommend repositories. Provide **either** `q` **or** `similarTo`.

| Query param | Type | Description |
|---|---|---|
| `q` | string | Keywords, e.g. `react` or `machine-learning`. Up to 4 terms; lowercase letters, numbers, hyphens only |
| `language` | string | Optional. Only used with `q`; filters candidates by language |
| `similarTo` | string | `owner/repo`. Finds repositories sharing its topics and language |

**How ranking works.** The backend collects up to about 90 candidates from the GitHub Search API (at least 10 stars, pushed within a year, no forks, not archived), then scores each one from 0 to 100:

| Signal | Weight | Computation |
|---|---|---|
| Topic overlap | 40% | Share of the search's (or seed repo's) topics the candidate also has |
| Language match | 20% | 1 if the primary language matches, else 0. Dropped and the rest renormalised when there is no language to match |
| Stars | 25% | Log scale, so 50k and 60k stars score almost the same |
| Recency | 15% | Exponential decay, halves every 180 days since the last push |

This is a hand-weighted heuristic over search results, not a machine-learning model. The weights are not tuned against user feedback.

**Response `200`**
```json
{
  "mode": "similar",
  "seed": "facebook/react",
  "profile": { "topics": ["react", "javascript", "ui"], "language": "JavaScript" },
  "results": [
    {
      "id": 1,
      "fullName": "preactjs/preact",
      "description": "Fast 3kB alternative to React",
      "htmlUrl": "https://github.com/preactjs/preact",
      "language": "JavaScript",
      "stars": 37000,
      "forks": 2000,
      "topics": ["react", "ui"],
      "pushedAt": "2026-05-30T08:00:00Z",
      "license": "MIT",
      "score": 78,
      "breakdown": { "topics": 67, "language": 100, "stars": 91, "recency": 98 },
      "sharedTopics": ["react", "ui"]
    }
  ]
}
```

Additional errors: `422` if both or neither of `q` / `similarTo` are sent, or if the seed repository has no topics. The GitHub Search API has its own, stricter rate limit (see below).

---

### `GET /api/repos/:owner/:repo/readme`

Fetch a repository's README for the viewer.

```json
{
  "name": "README.md",
  "path": "README.md",
  "htmlUrl": "https://github.com/owner/repo/blob/main/README.md",
  "markdown": "# Title\n...",
  "truncated": false,
  "rawBase": "https://raw.githubusercontent.com/owner/repo/main/",
  "blobBase": "https://github.com/owner/repo/blob/main/",
  "dir": ""
}
```

- `rawBase`, `blobBase`, and `dir` let the browser resolve relative images (to `raw.githubusercontent.com`) and relative links (to `github.com`), including READMEs in subfolders.
- READMEs over 300,000 characters are truncated (`truncated: true`). Files too large for GitHub's contents API return `413`.
- `404` means the repository has no README.

**Security note.** README content is untrusted. The viewer parses inline HTML, then sanitises it with a GitHub-style allowlist before rendering. The order of the rehype plugins (raw → sanitize → slug → highlight) is deliberate: highlighting must run after sanitising, never before.

---

## GitHub API usage

Because GitHub's limits are the main constraint, here is what each action costs (results are cached for 60 seconds, and repeat lookups of the same user are free within that window).

| Action | GitHub requests |
|---|---|
| Search a username (profile + repos + language chart + insights) | up to about 14 |
| Expand a repository card | 1 |
| Compare two repositories | 6 |
| Discover by keyword | 2–3 (Search API) |
| Discover similar to a repo | up to 4 (1 repo lookup + up to 3 Search API) |
| Open a README | 1 |

| Limit | Without token | With token |
|---|---|---|
| Core API | 60 / hour | 5,000 / hour |
| Search API | 10 / minute | 30 / minute |

Without a token, only about four profile searches fit in an hour. Set `GITHUB_TOKEN` for any real use.

---

## Deployment

Both services are deployed on Render.

**Backend** (web service)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `node src/index.js` |
| Env: `GITHUB_TOKEN` | Your token (no scopes) |
| Env: `FRONTEND_ORIGIN` | The deployed frontend URL, with no trailing slash |
| Env: `NODE_ENV` | `production` |

The backend sets `trust proxy` so the rate limiter sees real client IPs behind Render's load balancer, and exposes `/health` for health checks.

**Frontend** (static site)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Env: `VITE_API_URL` | `https://<your-backend>.onrender.com/api` |

---

## Project Structure

```
github-explorer/
│
├── backend/                          # Express proxy server
│   ├── src/
│   │   ├── index.js                  # App entry: middleware, routes, server start
│   │   ├── routes/
│   │   │   ├── github.js             # Users, repos, languages, language-stats
│   │   │   ├── compare.js            # GET /api/compare
│   │   │   ├── insights.js           # GET /api/users/:username/insights
│   │   │   ├── discovery.js          # GET /api/discover
│   │   │   └── readme.js             # GET /api/repos/:owner/:repo/readme
│   │   ├── services/
│   │   │   ├── github.js             # GitHub API calls, response shaping, error normalisation
│   │   │   ├── compare.js            # Repo snapshots, Link-header counting of commits/contributors
│   │   │   ├── insights.js           # Pure stat transforms (languages, growth, stars) + activity
│   │   │   ├── discovery.js          # Candidate search + weighted scoring (scoreRepo)
│   │   │   ├── readme.js             # README fetch, decode, URL bases
│   │   │   └── cache.js              # In-memory TTL cache (Map + timestamps, 60 s, auto-purge)
│   │   └── middleware/
│   │       └── errorHandler.js       # Central error → JSON response (last in chain)
│   ├── .env.example                  # Documents PORT, GITHUB_TOKEN, FRONTEND_ORIGIN
│   └── package.json
│
└── frontend/                         # React + Vite SPA
    ├── src/
    │   ├── api/
    │   │   └── client.js             # Axios instance + 8 API methods; normalises errors
    │   ├── hooks/
    │   │   ├── useUser.js            # Profile fetch, loading/error state
    │   │   ├── useRepos.js           # Pagination, sort, direction, load-more
    │   │   ├── useLanguageStats.js   # Aggregated language stats for the chart
    │   │   ├── useRecentSearches.js  # localStorage persistence, max 8 entries, deduped
    │   │   ├── useCompare.js         # Repository comparison request
    │   │   ├── useInsights.js        # Insights dashboard data
    │   │   ├── useDiscover.js        # Discovery request (keyword / similar)
    │   │   └── useReadme.js          # README fetch with cancellation
    │   ├── utils/
    │   │   ├── formatters.js         # Relative dates ("3 days ago"), compact numbers ("12.3k")
    │   │   ├── langColours.js        # GitHub Linguist colours + deterministic fallback hash
    │   │   └── readmeUrls.js         # Resolve README-relative image/link URLs
    │   ├── components/
    │   │   ├── search/               # SearchBar (input, recent searches dropdown)
    │   │   ├── profile/              # UserProfile, LanguageChart (donut/bar toggle)
    │   │   ├── repos/                # RepoList, RepoCard, RepoDetails, SortBar
    │   │   ├── compare/              # CompareView: two inputs + comparison table
    │   │   ├── insights/             # InsightsDashboard: stat cards + four charts
    │   │   ├── discover/             # DiscoverView: keyword / similar modes, scored result cards
    │   │   ├── readme/               # ReadmeModal (lazy-loaded), ReadmeViewer (Markdown + TOC)
    │   │   └── ui/                   # Skeleton, ErrorBoundary
    │   ├── App.jsx                   # Root — hooks, tabs (Profile / Compare / Discover), layout
    │   ├── App.module.css
    │   ├── index.css                 # CSS custom properties (design tokens) + global reset
    │   └── main.jsx                  # React root, mounts ErrorBoundary + App
    ├── index.html                    # Vite entry HTML
    ├── vite.config.js                # Dev proxy /api → :4000; vendor chunk splitting
    └── package.json
```

Each component folder also contains its `*.module.css` file.

---

## Known Limitations

- **No automated tests.** The pure functions (`scoreRepo`, `growthByYear`, `resolveRelativeUrl`, the Link-header parser) are the best first targets.
- **In-memory cache.** It resets on restart and is not shared across instances. Redis would fix both.
- **Insights analyse at most 300 repositories** and exclude forks. "Most active" means commits in the last 90 days (any author) on only the 6 most recently pushed repos, to cap API calls.
- **"Most popular languages" counts repos per primary language**, not lines of code. True byte counts need one API call per repository.
- **Discovery re-ranks GitHub search results.** It cannot surface a match that search did not return, and its weights are untuned.
- **README viewer is close to, not identical to, GitHub's renderer.** Emoji shortcodes (`:tada:`), Mermaid diagrams, math, and `<picture>` dark/light switching are not supported. Unsupported HTML is stripped. Code blocks without a language tag are not highlighted.
- **Free-tier cold starts** on Render delay the first request after inactivity.

---

## Next Steps

### What I chose not to build (and why)

**Authentication / OAuth.** GitHub OAuth would allow private repos and a 15,000 req/hr limit. Skipped because the scope is public data and it needs a database to store tokens safely.

**Persistent caching (Redis).** The in-memory cache meets the 60-second TTL requirement with zero infrastructure. Redis becomes worthwhile with more than one instance, or if the discovery and insights endpoints need longer-lived caching.

**Machine-learned recommendations.** Discovery uses a transparent weighted score. A learned ranker would need click or feedback data this project does not collect.

**Infinite scroll.** "Load more" is deliberate (accessibility, no accidental loads). `IntersectionObserver` infinite scroll would feel more native on mobile.

### What I would build next

1. **Test suite**: Vitest for hooks and pure utils, Supertest + Jest for routes and services.
2. **CI/CD**: GitHub Actions to lint and test on every pull request and auto-deploy `main` to Render.
3. **User comparison**: compare two usernames (follower counts, language mix, activity), complementing the repository comparison.
4. **Activity heatmap**: contribution-style graph from the GitHub Events API.
5. **README viewer polish**: scroll-spy highlighting in the table of contents, a focus trap in the modal, Mermaid and emoji support.
6. **Repository filtering**: filter the list by language, topic, or fork status client-side.
7. **Bookmarks and theme toggle**: save profiles locally; the CSS custom properties already support a `data-theme` swap.