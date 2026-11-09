const { Router } = require("express");
const { compareRepos } = require("../services/compare");

const router = Router();

const OWNER_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

/** "owner/repo" -> { owner, repo } or null. Strict: these go into upstream URL paths. */
function parseRef(ref) {
  const parts = String(ref || "").trim().split("/");
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === "." || repo === "..") return null;
  return { owner, repo };
}

// GET /api/compare?a=facebook/react&b=vuejs/core
router.get("/compare", async (req, res, next) => {
  const a = parseRef(req.query.a);
  const b = parseRef(req.query.b);

  if (!a || !b) {
    return res.status(422).json({
      error: true,
      message: 'Both repositories must be in "owner/repo" format.',
    });
  }
  if (`${a.owner}/${a.repo}`.toLowerCase() === `${b.owner}/${b.repo}`.toLowerCase()) {
    return res.status(422).json({ error: true, message: "Pick two different repositories." });
  }

  try {
    return res.json(await compareRepos(a, b));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;