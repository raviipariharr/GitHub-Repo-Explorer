const { Router } = require("express");
const { getInsights } = require("../services/insights");

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

// GET /api/users/:username/insights
router.get("/users/:username/insights", async (req, res, next) => {
  const { username } = req.params;

  if (!USERNAME_RE.test(username)) {
    return res.status(422).json({ error: true, message: "Invalid username." });
  }

  try {
    const { data, fromCache } = await getInsights(username);
    res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;