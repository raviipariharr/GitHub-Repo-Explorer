const { Router } = require("express");
const {
  getUser,
  getRepos,
  getRepoLanguages,
  getAllRepoLanguages,
} = require("../services/github");

const router = Router();

/**
 * Validate username: GitHub allows alphanumeric + hyphens, 1–39 chars,
 * cannot start/end with a hyphen.
 */
function isValidUsername(username) {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

// GET /api/users/:username
router.get("/users/:username", async (req, res, next) => {
  const { username } = req.params;

  if (!isValidUsername(username)) {
    return res.status(422).json({
      error: true,
      message: `"${username}" is not a valid GitHub username.`,
    });
  }

  try {
    const { data, fromCache } = await getUser(username);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:username/repos?page=1&sort=updated&direction=desc
router.get("/users/:username/repos", async (req, res, next) => {
  const { username } = req.params;

  if (!isValidUsername(username)) {
    return res.status(422).json({
      error: true,
      message: `"${username}" is not a valid GitHub username.`,
    });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const VALID_SORTS = ["updated", "stars", "full_name", "created"];
  const sort = VALID_SORTS.includes(req.query.sort) ? req.query.sort : "updated";
  const direction = req.query.direction === "asc" ? "asc" : "desc";

  try {
    const { data, fromCache } = await getRepos(username, { page, sort, direction });
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:username/repos/:repo/languages
router.get("/users/:username/repos/:repo/languages", async (req, res, next) => {
  const { username, repo } = req.params;

  if (!isValidUsername(username)) {
    return res.status(422).json({ error: true, message: "Invalid username." });
  }

  try {
    const { data, fromCache } = await getRepoLanguages(username, repo);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:username/language-stats
router.get("/users/:username/language-stats", async (req, res, next) => {
  const { username } = req.params;

  if (!isValidUsername(username)) {
    return res.status(422).json({ error: true, message: "Invalid username." });
  }

  try {
    const { data, fromCache } = await getAllRepoLanguages(username);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;