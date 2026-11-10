// MongoDB ids look like "6730f1c2a1b2c3d4e5f60718" (24 hex characters).
// If someone requests /api/posts/hello, Mongoose would throw a CastError (→ 500).
// This middleware turns that into a clean 404 instead.
import mongoose from "mongoose";
import { httpError } from "../utils/httpError.js";

export function validateObjectId(...params) {
  return (req, res, next) => {
    for (const p of params) {
      if (!mongoose.isValidObjectId(req.params[p])) throw httpError(404, "Not found");
    }
    next();
  };
}
