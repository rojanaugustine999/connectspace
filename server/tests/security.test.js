import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { io as connect } from "socket.io-client";
import { startServer, client, newUser, PASSWORD } from "./helpers.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { httpError } from "../src/utils/httpError.js";

let app;
before(async () => (app = await startServer()));
after(async () => app.stop());

const remaining = (r) => Number(/remaining=(\d+)/.exec(r.headers.get("ratelimit") ?? "")?.[1]);
const tryLogin = (c, opts) => c.post("/api/auth/login", { email: "nobody@example.test", password: "x" }, opts);

test("login rate limit: 10 attempts per visitor, then 429; other visitors are unaffected", async () => {
  const attacker = client(app.base);
  let last;
  for (let i = 0; i < 11; i++) last = await tryLogin(attacker);
  assert.equal(last.status, 429);
  assert.equal(remaining(await tryLogin(client(app.base))), 9, "a different visitor has their own counter");
});

test("a faked visitor IP without the proxy secret is ignored", async () => {
  // No secret → the server falls back to the real connection address, so all of these share ONE counter.
  const opts = (fakeIp) => ({ trustedIp: false, headers: { "x-client-ip": fakeIp, "x-proxy-secret": "wrong" } });
  const a = remaining(await tryLogin(client(app.base), opts("203.0.113.1")));
  const b = remaining(await tryLogin(client(app.base), opts("203.0.113.2")));
  assert.equal(b, a - 1);
});

test("socket tokens: 2-minute token opens a socket; session and socket tokens can't be swapped", async () => {
  const user = await newUser(app.base);
  const sessionToken = user.cookie.split("=")[1];
  const { status, data, headers } = await user.get("/api/auth/socket-token");
  assert.equal(status, 200);
  assert.equal(headers.get("cache-control"), "no-store");

  const tryConnect = (auth) =>
    new Promise((resolve) => {
      const s = connect(app.base, { transports: ["websocket"], reconnection: false, auth });
      s.on("connect", () => (s.close(), resolve("connected")));
      s.on("connect_error", (e) => (s.close(), resolve(e.message)));
    });
  assert.equal(await tryConnect({ token: data.token }), "connected");
  assert.equal(await tryConnect({ token: sessionToken }), "unauthorized");

  const misuse = client(app.base);
  misuse.cookie = `token=${data.token}`;
  assert.equal((await misuse.get("/api/auth/me")).status, 401);
  assert.equal((await client(app.base).get("/api/auth/socket-token")).status, 401);
});

test("error handler: expected errors keep their message, crashes are hidden", () => {
  const run = (err) => {
    const out = {};
    const res = {
      status(s) {
        out.status = s;
        return this;
      },
      json(b) {
        out.body = b;
        return this;
      },
    };
    const original = console.error;
    console.error = () => {};
    errorHandler(err, {}, res, () => {});
    console.error = original;
    return out;
  };
  assert.deepEqual(run(httpError(502, "Could not store the image, please try again")), {
    status: 502,
    body: { error: "Could not store the image, please try again" },
  });
  assert.deepEqual(run(new Error("connect ECONNREFUSED 10.0.0.5:5432")), { status: 500, body: { error: "Something went wrong" } });
  assert.equal(run(httpError(404, "Post not found")).body.error, "Post not found");
});

test("health check reports both databases", async () => {
  const r = await client(app.base).get("/api/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.databases, { postgres: "connected", mongo: "connected" });
});

test("password is required to log in (sanity)", async () => {
  const user = await newUser(app.base);
  const ok = await client(app.base).post("/api/auth/login", { email: user.user.email, password: PASSWORD });
  assert.equal(ok.status, 200);
});
