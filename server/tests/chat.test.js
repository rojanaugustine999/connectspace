// Real-time tests: real Socket.io clients talking to the real server.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { io as connect } from "socket.io-client";
import { startServer, newUser, wait } from "./helpers.js";

let app, alice, bob, outsider, convId;
const sockets = [];

function openSocket({ cookie, auth } = {}) {
  return new Promise((resolve, reject) => {
    const s = connect(app.base, {
      transports: ["websocket"],
      reconnection: false,
      ...(cookie && { extraHeaders: { Cookie: cookie } }),
      ...(auth && { auth }),
    });
    sockets.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", (err) => reject(err));
  });
}
const record = (socket, event) => {
  const got = [];
  socket.on(event, (data) => got.push(data));
  return got;
};
const emit = (socket, event, data) => new Promise((resolve) => socket.emit(event, data, resolve));

before(async () => {
  app = await startServer();
  [alice, bob, outsider] = await Promise.all([newUser(app.base, "Alice"), newUser(app.base, "Bob"), newUser(app.base, "Outsider")]);
  convId = (await alice.post("/api/conversations", { username: bob.user.username })).data.conversation.id;
});
after(async () => {
  sockets.forEach((s) => s.close());
  await app.stop();
});

test("sockets refuse visitors who aren't logged in", async () => {
  await assert.rejects(openSocket(), /unauthorized/);
  await assert.rejects(openSocket({ cookie: "token=fake.token.here" }), /unauthorized/);
});

test("one conversation per pair, even when both start it at the same moment", async () => {
  const [a, b] = await Promise.all([
    alice.post("/api/conversations", { username: bob.user.username }),
    bob.post("/api/conversations", { username: alice.user.username }),
  ]);
  assert.equal(a.data.conversation.id, convId);
  assert.equal(b.data.conversation.id, convId);
  assert.equal((await alice.post("/api/conversations", { username: alice.user.username })).status, 400);
});

test("messages arrive live for both people (all their tabs), never for outsiders", async () => {
  const aliceTab1 = await openSocket({ cookie: alice.cookie });
  const aliceTab2 = await openSocket({ cookie: alice.cookie });
  const bobSock = await openSocket({ cookie: bob.cookie });
  const outsiderSock = await openSocket({ cookie: outsider.cookie });
  const [bobGot, tab2Got, outsiderGot] = [record(bobSock, "message:new"), record(aliceTab2, "message:new"), record(outsiderSock, "message:new")];

  const ack = await emit(aliceTab1, "message:send", { conversationId: convId, text: "  Hi Bob!  ", clientId: "tmp-1" });
  await wait(300);
  assert.equal(ack.ok, true);
  assert.equal(ack.message.text, "Hi Bob!");
  assert.equal(bobGot.length, 1);
  assert.equal(bobGot[0].message.id, ack.message.id);
  assert.equal(bobGot[0].clientId, "tmp-1");
  assert.equal(tab2Got.length, 1);
  assert.equal(outsiderGot.length, 0);

  const empty = await emit(aliceTab1, "message:send", { conversationId: convId, text: "   " });
  assert.equal(empty.ok, false);
  const intruder = await emit(outsiderSock, "message:send", { conversationId: convId, text: "let me in" });
  assert.deepEqual([intruder.ok, intruder.error], [false, "Conversation not found"]);
  const badId = await emit(aliceTab1, "message:send", { conversationId: "nope", text: "x" });
  assert.equal(badId.ok, false);
});

test("typing reaches only the other person, in the order it was sent", async () => {
  const aliceSock = await openSocket({ cookie: alice.cookie });
  const bobSock = await openSocket({ cookie: bob.cookie });
  const bobSaw = record(bobSock, "typing");
  const aliceSaw = record(aliceSock, "typing");
  for (const isTyping of [true, false, true, false]) aliceSock.emit("typing", { conversationId: convId, isTyping });
  await wait(1500);
  assert.deepEqual(bobSaw.map((t) => t.isTyping), [true, false, true, false]);
  assert.equal(aliceSaw.length, 0);
});

test("unread counts and read receipts", async () => {
  const aliceSock = await openSocket({ cookie: alice.cookie });
  const bobSock = await openSocket({ cookie: bob.cookie });
  await emit(aliceSock, "message:send", { conversationId: convId, text: "Are you free later?" });

  const unread = (await bob.get("/api/conversations/unread-count")).data.unreadCount;
  assert.ok(unread >= 1);
  const list = await bob.get("/api/conversations");
  assert.equal(list.data.conversations[0].lastMessage.text, "Are you free later?");

  const receipts = record(aliceSock, "messages:read");
  const ack = await emit(bobSock, "messages:read", { conversationId: convId });
  await wait(300);
  assert.equal(ack.ok, true);
  assert.equal((await bob.get("/api/conversations/unread-count")).data.unreadCount, 0);
  assert.equal(receipts.length, 1);
});

test("history: newest 30 first page, older page continues without overlap; outsiders get 404", async () => {
  for (let i = 0; i < 31; i++) await bob.post(`/api/conversations/${convId}/messages`, { text: `msg ${i}` });
  const first = await alice.get(`/api/conversations/${convId}/messages`);
  assert.equal(first.data.messages.length, 30);
  assert.equal(first.data.messages.at(-1).text, "msg 30");
  const older = await alice.get(`/api/conversations/${convId}/messages?cursor=${encodeURIComponent(first.data.nextCursor)}`);
  const ids = new Set([...first.data.messages, ...older.data.messages].map((m) => m.id));
  assert.equal(ids.size, first.data.messages.length + older.data.messages.length);
  assert.equal((await outsider.get(`/api/conversations/${convId}/messages`)).status, 404);
});

test("notifications are pushed live", async () => {
  const outsiderSock = await openSocket({ cookie: outsider.cookie });
  const got = record(outsiderSock, "notification:new");
  await alice.post(`/api/users/${outsider.user.username}/follow`);
  await wait(300);
  assert.equal(got.length, 1);
  assert.equal(got[0].notification.type, "follow");
  assert.equal(got[0].notification.actor.username, alice.user.username);
});
