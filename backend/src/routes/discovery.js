const { Router } = require("express");
const { getRecommendations } = require("../services/discovery");

const router = Router();

const OWNER_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const TERM_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const LANG_RE = /^[A-Za-z0-9+#. -]{1,30}$/;

function parseRef(ref) {
  const parts = String(ref || "").trim().split("/");
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === "." || repo === "..") return null;
  return { owner, repo };
}

// GET /api/discover?q=react&language=JavaScript
// GET /api/discover?similarTo=facebook/react
router.get("/discover", async (req, res, next) => {
  const { q, similarTo, language } = req.query;

  if ((q && similarTo) || (!q && !similarTo)) {
    return res.status(422).json({ error: true, message: 'Provide either "q" or "similarTo".' });
  }

  let params;

  if (similarTo) {
    const ref = parseRef(similarTo);
    if (!ref) {
      return res.status(422).json({ error: true, message: 'Use "owner/repo" format.' });
    }
    params = { similarTo: ref };
  } else {
    if (String(q).length > 60) {
      return res.status(422).json({ error: true, message: "Search is too long (max 60 characters)." });
    }
    const terms = String(q).toLowerCase().split(/[\s,]+/).filter((t) => TERM_RE.test(t)).slice(0, 4);
    if (terms.length === 0) {
      return res.status(422).json({
        error: true,
        message: "Use plain keywords like \"react\" or \"machine-learning\" (letters, numbers, hyphens).",
      });
    }
    if (language && !LANG_RE.test(String(language))) {
      return res.status(422).json({ error: true, message: "Invalid language." });
    }
    params = { terms, language: language ? String(language) : null };
  }

  try {
    const { data, fromCache } = await getRecommendations(params);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;