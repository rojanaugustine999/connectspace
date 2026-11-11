// Who is the real visitor? Needed for per-person rate limits and useful logs.
//
// In production a request travels: browser → Vercel → Render's edge network → this app.
// By the time it arrives, the address Express sees (req.ip) belongs to one of those proxies,
// not to the visitor. Counting proxy hops is fragile (the chain can change), so instead:
//
//   1. Vercel's middleware (client/middleware.js) reads the visitor's IP. Vercel sets that header
//      itself and overwrites anything the browser sends, so it can't be faked at that point.
//   2. It forwards the IP in "x-client-ip" together with a shared secret in "x-proxy-secret".
//   3. Here we only believe "x-client-ip" if the secret matches. Someone calling the API directly
//      can send any x-client-ip they like, but without the secret it's ignored.
import crypto from "node:crypto";

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  // timingSafeEqual: compares in constant time, so an attacker can't guess the secret
  // one character at a time by measuring how long the comparison takes.
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function clientIp(req) {
  const secret = process.env.PROXY_SECRET;
  const sent = req.get("x-proxy-secret");
  if (secret && sent && sameSecret(sent, secret)) {
    const ip = req.get("x-client-ip");
    if (ip) return ip;
  }
  return req.ip; // direct request (or no secret configured): use what Express sees
}
