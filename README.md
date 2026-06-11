# GitHub Explorer

A full-stack GitHub profile and repository explorer built as a Full Stack Developer . The application lets you search any GitHub username and instantly see their public profile — avatar, bio, follower counts — alongside a paginated, sortable repository list, per-repository language breakdowns, and an aggregated language statistics chart across all their public repos. The frontend never calls the GitHub API directly; all requests are proxied through a Node.js/Express backend that validates input, normalises errors, and caches responses for 60 seconds to stay well within GitHub's rate limits.

---

## Live Demo Links

| | URL |
|---|---|
| Frontend | https://github-explorer-frontend-39ed.onrender.com/ |
| Backend API |https://github-explorer-backend-wi6k.onrender.com/ |

> To deploy: frontend → [Vercel](https://vercel.com) (set `VITE_API_URL` env var), backend → [Railway](https://railway.app) or [Render](https://render.com) (set `GITHUB_TOKEN` + `FRONTEND_ORIGIN` env vars).

---

## Tech Stack

### Backend

| Library | Version | Why |
|---|---|---|
| **Node.js** | ≥ 18 | Runtime — async I/O fits the proxy-heavy workload |
| **Express** | ^4.18 | Minimal, well-understood HTTP framework; no overhead from larger frameworks |
| **axios** | ^1.6 | HTTP client for GitHub API calls — interceptors, timeout, clean error objects |
| **helmet** | ^7.1 | Sets secure HTTP headers in one line |
| **morgan** | ^1.10 | Request logging for development debugging |
| **cors** | ^2.8 | Locks allowed origins to the frontend URL only |
| **express-rate-limit** | ^7.1 | Global IP-based rate limiter (120 req/min) — protects the proxy from abuse |
| **nodemon** | ^3.0 | Hot-reload during development |
| **dotenv** | built-in | Loads `GITHUB_TOKEN` and other secrets from `.env` |

The in-memory cache (`src/services/cache.js`) is a plain `Map` with TTL timestamps — no Redis dependency, zero config, appropriate for a single-instance dev/demo server.

### Frontend

| Library | Version | Why |
|---|---|---|
| **React** | ^19 | Component model, hooks, and the ecosystem around it |
| **Vite** | ^8 | Sub-second HMR, native ESM, and simple proxy config for dev |
| **axios** | ^1.17 | Consistent HTTP client across both layers; normalised error shape |
| **Recharts** | ^3.8 | Composable chart primitives built on D3 — donut and bar charts with minimal boilerplate |
| **CSS Modules** | built-in (Vite) | Scoped styles with zero runtime cost; no CSS-in-JS overhead |

**No state management library** — React's built-in `useState`/`useCallback`/`useRef` is sufficient for the data flow here. Adding Redux or Zustand would be over-engineering for this scope.

---

## How to Run Locally

> **Prerequisites:** Node.js 18 or later. That's it.

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

**Optional — add a GitHub token** (raises rate limit from 60 → 5 000 req/hr):

1. Visit https://github.com/settings/tokens → Generate new token (classic)
2. Give it any name, select **no scopes** (only public data needed)
3. Paste the token into `backend/.env`:

```env
PORT=4000
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
FRONTEND_ORIGIN=http://localhost:5173
```

Restart the backend — you'll see `GitHub token: ✅ configured`.

### 3. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173**.

> No `.env` file needed for local development — Vite's dev server proxies all `/api` requests to `:4000` automatically via `vite.config.js`.

### 4. Production build (optional)

```bash
cd frontend
npm run build      # outputs to frontend/dist/
npm run preview    # serves the built files locally
```

---

## API Documentation

All endpoints are prefixed with `/api`. Every response includes an `X-Cache: HIT | MISS` header indicating whether the result was served from the 60-second in-memory cache.

---

### `GET /health`

Server uptime check. No auth required.

**Response `200`**
```json
{
  "status": "ok",
  "uptime": 42.3
}
```

---

### `GET /api/users/:username`

Fetch a GitHub user's public profile.

**URL params**

| Param | Type | Rules |
|---|---|---|
| `username` | string | Alphanumeric + hyphens, 1–39 chars, cannot start/end with hyphen |


**Error responses**

| Status | Condition | Body |
|---|---|---|
| `422` | Username fails regex validation | `{ "error": true, "message": "\"--bad\" is not a valid GitHub username." }` |
| `404` | GitHub user does not exist | `{ "error": true, "message": "GitHub user not found." }` |
| `429` | GitHub rate limit hit | `{ "error": true, "message": "GitHub API rate limit exceeded.", "resetAt": "2024-06-01T12:00:00.000Z" }` |
| `502` | Cannot reach GitHub API | `{ "error": true, "message": "Could not reach GitHub API." }` |
| `504` | GitHub API timed out | `{ "error": true, "message": "Request to GitHub timed out." }` |

---

### `GET /api/users/:username/repos`

Fetch one page of a user's public repositories.

**URL params** — same validation as above.

**Query params**

| Param | Type | Default | Allowed values |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1 |
| `sort` | string | `updated` | `updated` · `stars` · `full_name` · `created` |
| `direction` | string | `desc` | `asc` · `desc` |

```

**Response `200`**

### `GET /api/users/:username/repos/:repo/languages`

Fetch the language byte breakdown for a single repository. Used when expanding a repo card.

**URL params**

| Param | Type | Description |
|---|---|---|
| `username` | string | GitHub username |
| `repo` | string | Repository name (exact, case-insensitive on GitHub's side) |

**Response `200`**
```json
{
  "C": 19872872,
  "Python": 572312,
  "Shell": 132891,
  "Makefile": 48231
}
---

## Project Structure

```
github-explorer/
│
├── backend/                          # Express proxy server
│   ├── src/
│   │   ├── index.js                  # App entry: registers middleware, routes, starts server
│   │   ├── routes/
│   │   │   └── github.js             # Route handlers — validates input, calls service, sets X-Cache
│   │   ├── services/
│   │   │   ├── github.js             # All GitHub API calls, response shaping, error normalisation
│   │   │   └── cache.js              # In-memory TTL cache (Map + timestamps, 60 s, auto-purge)
│   │   └── middleware/
│   │       └── errorHandler.js       # Central error → JSON response (last middleware in chain)
│   ├── .env.example                  # Documents PORT, GITHUB_TOKEN, FRONTEND_ORIGIN
│   └── package.json
│
└── frontend/                         # React + Vite SPA
    ├── src/
    │   ├── api/
    │   │   └── client.js             # Axios instance + all 4 API methods; normalises errors
    │   ├── hooks/
    │   │   ├── useUser.js            # Profile fetch, loading/error state
    │   │   ├── useRepos.js           # Pagination, sort, direction, load-more, username reset
    │   │   ├── useLanguageStats.js   # Aggregated language stats for the chart
    │   │   └── useRecentSearches.js  # localStorage persistence, max 8 entries, deduped
    │   ├── utils/
    │   │   ├── formatters.js         # Relative dates ("3 days ago"), compact numbers ("12.3k")
    │   │   └── langColours.js        # GitHub Linguist colour palette + deterministic fallback hash
    │   ├── components/
    │   │   ├── search/
    │   │   │   ├── SearchBar.jsx          # Search input, submit, recent searches dropdown
    │   │   │   └── SearchBar.module.css
    │   │   ├── profile/
    │   │   │   ├── UserProfile.jsx        # Avatar, bio, followers/following/repos stats, meta links
    │   │   │   ├── UserProfile.module.css
    │   │   │   ├── LanguageChart.jsx      # Donut + bar chart toggle (Recharts), interactive legend
    │   │   │   └── LanguageChart.module.css
    │   │   ├── repos/
    │   │   │   ├── RepoList.jsx           # Skeleton → cards → load more orchestration
    │   │   │   ├── RepoCard.jsx           # Name, description, topics, language dot, stars, date
    │   │   │   ├── RepoDetails.jsx        # Expanded panel: stats grid + language stacked bar
    │   │   │   ├── SortBar.jsx            # Sort by Updated/Stars/Name/Created with ↑↓ toggle
    │   │   │   └── *.module.css
    │   │   └── ui/
    │   │       ├── Skeleton.jsx           # Shimmer loading placeholders (profile + repo card)
    │   │       ├── ErrorBoundary.jsx      # React class boundary — catches render errors app-wide
    │   │       └── *.module.css
    │   ├── App.jsx                   # Root — wires hooks + layout + conditional rendering
    │   ├── App.module.css
    │   ├── index.css                 # CSS custom properties (design tokens) + global reset
    │   └── main.jsx                  # React root, mounts ErrorBoundary + App
    ├── index.html                    # Vite entry HTML, GitHub SVG favicon
    ├── vite.config.js                # Dev proxy /api → :4000; code-splits recharts vendor chunk
    └── package.json
```

---

## Next Steps

### What I chose not to build (and why)

**Authentication / OAuth** — Adding GitHub OAuth would let users see private repos and raise the rate limit to 15 000 req/hr. Skipped because the assessment scope is public data only, and it would require a database to store tokens securely.

**Persistent caching (Redis)** — The in-memory `Map` cache resets on every server restart and doesn't scale across multiple processes. Redis would fix both. Chose the simpler in-process solution as it meets the 60-second TTL requirement with zero infrastructure.

**Testing suite** — No unit or integration tests were written. I would add Vitest for the frontend hooks/utils, and Supertest + Jest for the backend route handlers and service layer.

**Search beyond username** — The current search is username-exact only. GitHub's search API supports full-text search across repos, topics, and users — that would be a meaningful UX upgrade.

**Infinite scroll** — The "Load More" button is deliberate (better for accessibility and avoiding accidental loads), but infinite scroll via `IntersectionObserver` would feel more native on mobile.

### What I would build next

**1. User comparison view** — search two usernames side by side and compare follower counts, language distributions, and activity.

**2. Repository filtering** — filter the list by language, topic, or fork status client-side without re-fetching.

**3. Activity graph** — use the GitHub Events API to render a contribution-style heatmap showing commit activity over the past year.

**4. Bookmarks** — let users star profiles locally (localStorage or a small backend with SQLite) so they can return to them without re-searching.

**5. Dark / light theme toggle** — the CSS custom property system is already in place; adding a toggle is purely a `data-theme` attribute swap on `<html>`.

**6. Deployed CI/CD pipeline** — GitHub Actions workflow that runs linting + tests on every PR, and auto-deploys `main` to Vercel (frontend) and Railway (backend).
