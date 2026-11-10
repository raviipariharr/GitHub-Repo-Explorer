    const cache = require("./cache");
    const { githubClient, parseGitHubError } = require("./github");

    const WEIGHTS = { topics: 0.4, language: 0.2, stars: 0.25, recency: 0.15 };
    const RECENCY_HALF_LIFE_DAYS = 180;
    const MIN_STARS = 10;
    const PUSHED_WITHIN_DAYS = 365;
    const POOL_SIZE = 30;
    const MAX_RESULTS = 20;

    /* ── Scoring (pure, unit-testable) ────────────────────────────────────────── */

    /**
     * profile = { topics: string[], language: string | null }
     * Each signal is normalised to 0..1, then combined with WEIGHTS.
     *  - topics:   fraction of the profile's topics this repo also has
     *  - language: 1 if same primary language
     *  - stars:    log scale (1 star ≈ 0.06, 100k stars = 1) so 50k vs 60k barely differs
     *  - recency:  exponential decay, halves every 180 days since last push
     * If the profile has no language, that weight is dropped and the rest renormalised.
     */
    function scoreRepo(repo, profile, now = Date.now()) {
    const repoTopics = new Set((repo.topics || []).map((t) => t.toLowerCase()));
    const sharedTopics = profile.topics.filter((t) => repoTopics.has(t));

    const hasLang = Boolean(profile.language);
    const parts = {
        topics: profile.topics.length ? sharedTopics.length / profile.topics.length : 0,
        language: hasLang && repo.language === profile.language ? 1 : 0,
        stars: Math.min(1, Math.log10(repo.stargazers_count + 1) / 5),
        recency: Math.pow(
        0.5,
        Math.max(0, (now - new Date(repo.pushed_at).getTime()) / 86_400_000) / RECENCY_HALF_LIFE_DAYS
        ),
    };

    const active = Object.keys(WEIGHTS).filter((k) => k !== "language" || hasLang);
    const weightSum = active.reduce((s, k) => s + WEIGHTS[k], 0);
    const total = active.reduce((s, k) => s + WEIGHTS[k] * parts[k], 0) / weightSum;

    return {
        score: Math.round(total * 100),
        breakdown: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100)])),
        sharedTopics,
    };
    }

    function rank(items, profile, excludeId = null) {
    const seen = new Set();
    return items
        .filter((r) => r.id !== excludeId && !r.archived && !seen.has(r.id) && seen.add(r.id))
        .map((r) => ({
        id: r.id,
        fullName: r.full_name,
        description: r.description,
        htmlUrl: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics || [],
        pushedAt: r.pushed_at,
        license: r.license?.spdx_id || null,
        ...scoreRepo(r, profile),
        }))
        .sort((a, b) => b.score - a.score || b.stars - a.stars)
        .slice(0, MAX_RESULTS);
    }

    /* ── Candidate retrieval (GitHub Search API) ──────────────────────────────── */

    function qualifiers(language) {
    const since = new Date(Date.now() - PUSHED_WITHIN_DAYS * 86_400_000).toISOString().slice(0, 10);
    return [
        `stars:>=${MIN_STARS}`,
        `pushed:>${since}`,
        "fork:false",
        "archived:false",
        language ? `language:"${language}"` : null,
    ]
        .filter(Boolean)
        .join(" ");
    }

    // Default sort = best match, so the candidate pool is relevant, not just famous.
    async function search(q) {
    try {
        const { data } = await githubClient.get("/search/repositories", {
        params: { q, per_page: POOL_SIZE },
        });
        return data.items;
    } catch (err) {
        throw parseGitHubError(err);
    }
    }

    async function byKeyword(terms, language) {
    const quals = qualifiers(language);
    const queries = [
        `${terms.join(" ")} in:name,description,topics ${quals}`,
        ...terms.slice(0, 2).map((t) => `topic:${t} ${quals}`),
    ];
    const pools = await Promise.all(queries.map(search)); // 2-3 searches in parallel
    const profile = { topics: terms, language: language || null };
    return { mode: "keyword", profile, results: rank(pools.flat(), profile) };
    }

    async function bySimilar({ owner, repo }) {
    let meta;
    try {
        ({ data: meta } = await githubClient.get(`/repos/${owner}/${repo}`));
    } catch (err) {
        if (err.response?.status === 404) {
        throw { status: 404, message: `Repository "${owner}/${repo}" not found.` };
        }
        throw parseGitHubError(err);
    }

    const topics = (meta.topics || []).map((t) => t.toLowerCase());
    if (topics.length === 0) {
        throw {
        status: 422,
        message: `"${meta.full_name}" has no topics, so there is nothing to match on. Try a keyword search instead.`,
        };
    }

    const quals = qualifiers(null);
    const pools = await Promise.all(topics.slice(0, 3).map((t) => search(`topic:${t} ${quals}`)));
    const profile = { topics, language: meta.language };
    return {
        mode: "similar",
        seed: meta.full_name,
        profile,
        results: rank(pools.flat(), profile, meta.id),
    };
    }

    /** params: { terms, language } OR { similarTo: {owner, repo} } */
    async function getRecommendations(params) {
    const key = params.similarTo
        ? `discover:similar:${params.similarTo.owner}/${params.similarTo.repo}`.toLowerCase()
        : `discover:kw:${params.terms.join("+")}:${params.language || ""}`.toLowerCase();

    const cached = cache.get(key);
    if (cached) return { data: cached, fromCache: true };

    const data = params.similarTo
        ? await bySimilar(params.similarTo)
        : await byKeyword(params.terms, params.language);

    cache.set(key, data);
    return { data, fromCache: false };
    }

    module.exports = { getRecommendations, scoreRepo, rank };