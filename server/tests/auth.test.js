import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, uniqueUsername, PASSWORD } from "./helpers.js";

let app;
before(async () => (app = await startServer()));
after(async () => app.stop());

test("register: invalid data → 400 with a message per field", async () => {
  const r = await client(app.base).post("/api/auth/register", { name: "", username: "A!", email: "nope", password: "short" });
  assert.equal(r.status, 400);
  for (const field of ["name", "username", "email", "password"]) assert.ok(r.data.details[field], `missing error for ${field}`);
});

test("register → 201, logged in with an httpOnly cookie, password never returned or stored in plain text", async () => {
  const c = client(app.base);
  const username = uniqueUsername();
  const r = await c.post("/api/auth/register", { name: "Ada", username, email: `${username}@example.test`, password: PASSWORD });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.username, username);
  assert.ok(!("password" in r.data.user));
  assert.match(r.setCookie, /token=.+HttpOnly/i);
  assert.match(r.setCookie, /SameSite=Lax/i);

  const me = await c.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.username, username);

  const row = await app.prisma.user.findUnique({ where: { username } });
  assert.ok(row.password.startsWith("$2"), "password should be a bcrypt hash");
});

test("register: duplicate email (any case) → 409", async () => {
  const username = uniqueUsername();
  const body = { name: "Dup", username, email: `${username}@example.test`, password: PASSWORD };
  assert.equal((await client(app.base).post("/api/auth/register", body)).status, 201);
  const r = await client(app.base).post("/api/auth/register", { ...body, username: uniqueUsername(), email: body.email.toUpperCase() });
  assert.equal(r.status, 409);
  assert.ok(r.data.details.email);
});

test("login: wrong password and unknown email give the same 401 message", async () => {
  const username = uniqueUsername();
  const email = `${username}@example.test`;
  await client(app.base).post("/api/auth/register", { name: "Lin", username, email, password: PASSWORD });

  const wrong = await client(app.base).post("/api/auth/login", { email, password: "wrongpass1" });
  const unknown = await client(app.base).post("/api/auth/login", { email: "nobody@example.test", password: "whatever1" });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.data.error, unknown.data.error);

  const ok = await client(app.base).post("/api/auth/login", { email, password: PASSWORD });
  assert.equal(ok.status, 200);
});

test("logout clears the cookie; /me then needs login again", async () => {
  const c = client(app.base);
  const username = uniqueUsername();
  await c.post("/api/auth/register", { name: "Out", username, email: `${username}@example.test`, password: PASSWORD });
  const r = await c.post("/api/auth/logout");
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /token=;/);
  assert.equal((await c.get("/api/auth/me")).status, 401);
});

test("a forged token is rejected", async () => {
  const c = client(app.base);
  c.cookie = "token=not.a.real.token";
  assert.equal((await c.get("/api/auth/me")).status, 401);
});
