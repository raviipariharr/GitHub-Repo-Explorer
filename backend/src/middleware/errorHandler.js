/**
 * Central error-handling middleware.
 * Converts thrown objects (from github.js) into JSON responses.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Errors thrown by github.js are plain objects with { status, message }
  if (err && typeof err === "object" && err.status && err.message) {
    return res.status(err.status).json({
      error: true,
      message: err.message,
      ...(err.resetAt && { resetAt: err.resetAt }),
    });
  }

  // Unexpected errors
  console.error("[Unhandled Error]", err);
  return res.status(500).json({
    error: true,
    message: "An unexpected server error occurred.",
  });
}

module.exports = errorHandler;