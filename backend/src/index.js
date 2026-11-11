require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createApp } = require("./app");
const githubRoutes = require("./routes/github");
const insightsRoutes = require("./routes/insights");
const compareRoutes = require("./routes/compare");

const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 4000;
const discoveryRoutes = require("./routes/discovery");

app.use("/api", discoveryRoutes);
app.set("trust proxy", 1);

const readmeRoutes = require("./routes/readme");
app.use("/api", readmeRoutes);

// Security and utilities
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
  })
);
// Rate limiting
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: true,
      message: "Too many requests. Please slow down.",
    },
  })
);
console.log(typeof githubRoutes, typeof compareRoutes, typeof insightsRoutes);
// API routes
app.use("/api", githubRoutes);
app.use("/api", compareRoutes);
app.use("/api", insightsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Route not found.",
  });
});

// Central error handler
app.use(errorHandler);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 GitHub Explorer backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `GitHub token: ${
      process.env.GITHUB_TOKEN
        ? "✅ configured"
        : "⚠️ not set (60 req/hr limit)"
    }\n`
  );
});