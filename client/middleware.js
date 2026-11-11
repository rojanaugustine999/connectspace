// Runs on Vercel for every /api/* request, just before next.config.mjs forwards it to the Express API.
// It passes the visitor's real IP to the API, signed with a shared secret
// (see server/src/utils/clientIp.js for why).
import { NextResponse } from "next/server";

export function middleware(request) {
  const secret = process.env.PROXY_SECRET;
  if (!secret) return NextResponse.next(); // not configured: forward the request unchanged

  // On Vercel these headers are set by Vercel itself, which overwrites anything the browser
  // sends, so they're trustworthy here (unlike on the API server, where anyone could send them).
  const ip =
    request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";

  const headers = new Headers(request.headers);
  headers.set("x-proxy-secret", secret);
  if (ip) headers.set("x-client-ip", ip);
  else headers.delete("x-client-ip"); // never pass on a value the browser made up

  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
