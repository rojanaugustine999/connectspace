// validate(schema) → middleware that checks req.body against a Zod schema.
// Valid: req.body is replaced with the cleaned data (trimmed, lowercased...) and the request continues.
// Invalid: 400 with one message per field, e.g. { error: "Validation failed", details: { email: "Enter a valid email" } }
import { httpError } from "../utils/httpError.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".") || "body";
        details[field] ??= issue.message; // keep the first message per field
      }
      throw httpError(400, "Validation failed", details);
    }
    req.body = result.data;
    next();
  };
}
