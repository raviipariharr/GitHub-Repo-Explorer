const { Router } = require("express");
const { getReadme } = require("../services/readme");

const router = Router();

const OWNER_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

// GET /api/repos/:owner/:repo/readme
router.get("/repos/:owner/:repo/readme", async (req, res, next) => {
  const { owner, repo } = req.params;

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === "." || repo === "..") {
    return res.status(422).json({ error: true, message: "Invalid repository." });
  }

  try {
    const { data, fromCache } = await getReadme(owner, repo);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;