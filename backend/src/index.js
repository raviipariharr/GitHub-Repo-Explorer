require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const githubRoutes = require("./routes/github");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & utilities ─────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// CORS – allow the frontend dev server and production origin
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
  })
);

// Global rate-limit: 120 requests / 1 min per IP
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: "Too many requests. Please slow down." },
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", githubRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// 404 fallthrough
app.use((req, res) => {
  res.status(404).json({ error: true, message: "Route not found." });
});

// Central error handler (must be last)
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  GitHub Explorer backend running on http://localhost:${PORT}`);
  console.log(`   GitHub token: ${process.env.GITHUB_TOKEN ? "✅ configured" : "⚠️  not set (lower rate limits)"}\n`);
});