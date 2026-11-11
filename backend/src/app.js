const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const githubRoutes = require("./routes/github");
const compareRoutes = require("./routes/compare");
const insightsRoutes = require("./routes/insights");
const discoveryRoutes = require("./routes/discovery");
const readmeRoutes = require("./routes/readme");
const errorHandler = require("./middleware/errorHandler");

/**
 * Builds the Express app WITHOUT starting a server, so tests can import it
 * (Supertest) and each test file can get its own fresh rate limiter.
 */
function createApp({ rateLimitMax = 120 } = {}) {
  const app = express();

  // Trust Render's load balancer so express-rate-limit sees the real client IP
  app.set("trust proxy", 1);

  // ── Security & utilities ───────────────────────────────────────────────
  app.use(helmet());
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }
  app.use(express.json());

  // CORS – allow the frontend origin (set FRONTEND_ORIGIN in Render env vars)
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (curl, Postman, Render health checks)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      methods: ["GET"],
      allowedHeaders: ["Content-Type"],
    })
  );

  // Global rate limit: 120 requests / 1 min per IP
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: true, message: "Too many requests. Please slow down." },
    })
  );

  // ── Routes ─────────────────────────────────────────────────────────────
  app.use("/api", githubRoutes);
  app.use("/api", compareRoutes);
  app.use("/api", insightsRoutes);
  app.use("/api", discoveryRoutes);
  app.use("/api", readmeRoutes);

  // Health check — Render pings this to confirm the service is up
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // 404 fallthrough
  app.use((req, res) => {
    res.status(404).json({ error: true, message: "Route not found." });
  });

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };