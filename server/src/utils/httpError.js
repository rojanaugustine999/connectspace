// Create an error with an HTTP status code.
// `throw httpError(404, "User not found")` anywhere → errorHandler sends { error: "User not found" } with status 404.
export function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}
