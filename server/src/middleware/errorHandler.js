// 404 for routes that don't exist.
export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: every `next(err)` or thrown error in a route ends up here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Something went wrong";

  // Prisma P2002 = unique constraint failed (e.g. two sign-ups with the same email at the same moment).
  if (err.code === "P2002") {
    status = 409;
    message = "That already exists";
  }

  // Invalid JSON in the request body.
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON";
  }

  // Two kinds of server errors:
  // - Expected: thrown on purpose with httpError(), e.g. httpError(502, "Could not store the image…").
  //   Its message was written for users, so send it as is.
  // - Unexpected: a bug or crash (no .status). Its message might reveal internals (file paths,
  //   SQL…), so log the details for us and send only a generic message to the browser.
  const expected = Boolean(err.status);
  if (status >= 500) {
    console.error(expected ? `${status} ${message}` : err);
    if (!expected) message = "Something went wrong";
  }

  res.status(status).json({ error: message, ...(err.details && { details: err.details }) });
}
