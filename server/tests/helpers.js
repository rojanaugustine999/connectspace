// Shared test helpers: start the real app on a random port, and HTTP clients with their own cookie.
//
// SAFETY: tests create and delete users, posts and chats. They must never run against the live
// databases, so they refuse to start unless both databases are on localhost (as in CI).
import http from "node:http";
import crypto from "node:crypto";
import dotenv from "dotenv";

// Local runs read server/.env.test (never .env, which points at the live databases).
dotenv.config({ path: ".env.test", quiet: true });

process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-only-jwt-secret-that-is-at-least-32-chars";
process.env.PROXY_SECRET ??= "test-only-proxy-secret";
process.env.CLIENT_URL ??= "http://localhost:3000";

const isLocal = (url = "") => /@?(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
if (process.env.ALLOW_REMOTE_TEST_DB !== "1" && !(isLocal(process.env.DATABASE_URL) && isLocal(process.env.MONGO_URI))) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL and MONGO_URI must point at localhost test databases " +
      "(tests create and delete data). Set them in server/.env.test, or run the tests in CI."
  );
}

export const PASSWORD = "password123";

// Starts the real Express app + Socket.io on a free port.
export async function startServer() {
  const { default: app } = await import("../src/app.js");
  const { initSocket } = await import("../src/socket/index.js");
  const { connectMongo } = await import("../src/config/mongo.js");
  const { prisma } = await import("../src/config/prisma.js");
  const { default: mongoose } = await import("mongoose");

  await connectMongo();
  if (mongoose.connection.readyState !== 1) throw new Error("MongoDB is not connected");

  const server = http.createServer(app);
  const io = initSocket(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    base,
    prisma,
    mongoose,
    async stop() {
      await new Promise((resolve) => io.close(() => resolve())); // also closes the HTTP server
      await prisma.$disconnect();
      await mongoose.disconnect();
    },
  };
}

let counter = 0;
// Usernames must be 3–20 characters of a-z, 0-9 and _.
export function uniqueUsername(prefix = "u") {
  return `${prefix}${Date.now().toString(36).slice(-6)}${(counter++).toString(36)}${crypto.randomBytes(1).toString("hex")}`;
}

// A pretend browser: keeps its login cookie, and has its own visitor IP so rate limits
// (counted per visitor, see utils/clientIp.js) don't leak between tests.
export function client(base) {
  const ip = `10.${crypto.randomInt(256)}.${crypto.randomInt(256)}.${crypto.randomInt(1, 255)}`;
  let cookie = "";

  async function call(method, path, body, { headers = {}, trustedIp = true } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(trustedIp && { "x-proxy-secret": process.env.PROXY_SECRET, "x-client-ip": ip }),
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(cookie && { Cookie: cookie }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const pair = setCookie.split(";")[0];
      cookie = pair.endsWith("=") ? "" : pair; // "token=" means the cookie was cleared
    }
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      // not JSON (e.g. 204 No Content)
    }
    return { status: res.status, data, headers: res.headers, setCookie };
  }

  return {
    ip,
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
    get: (path, opts) => call("GET", path, undefined, opts),
    post: (path, body, opts) => call("POST", path, body, opts),
    patch: (path, body, opts) => call("PATCH", path, body, opts),
    del: (path, opts) => call("DELETE", path, undefined, opts),
  };
}

// Registers a brand-new user and returns a logged-in client (with .user).
export async function newUser(base, name = "Test User") {
  const c = client(base);
  const username = uniqueUsername();
  const r = await c.post("/api/auth/register", { name, username, email: `${username}@example.test`, password: PASSWORD });
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.data)}`);
  c.user = r.data.user;
  return c;
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
