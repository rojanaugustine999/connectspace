// One place to create rate limiters, so they all count per REAL visitor (see utils/clientIp.js).
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { clientIp } from "../utils/clientIp.js";

export function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // tells clients "RateLimit: limit=10, remaining=7, reset=…"
    legacyHeaders: false,
    // ipKeyGenerator groups IPv6 addresses by network block, because one person can easily get
    // a whole range of IPv6 addresses and would otherwise get a fresh limit for each one.
    keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
    message: { error: message },
  });
}
