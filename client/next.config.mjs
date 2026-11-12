// The browser only talks to THIS site (localhost:3000 in development, your-app.vercel.app in production).
// Requests to /api/* are passed on ("proxied") by Next.js to the Express API.
//
// Why? The login cookie then belongs to this site (a "first-party" cookie). If the browser
// called the API's own domain directly (e.g. *.onrender.com), the cookie would be "third-party",
// and Safari / iPhones block those, so login would silently fail.
//
// API_ORIGIN is read on the server (no NEXT_PUBLIC_ prefix), so it never reaches the browser.
const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Put the page title and description in <head> for every visitor, not only for known search bots.
  // (Next.js otherwise "streams" them later into <body> on dynamic pages, which link previews and
  // SEO checkers like Lighthouse don't read.)
  htmlLimitedBots: /.*/,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
