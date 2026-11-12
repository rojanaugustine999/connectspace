// Socket.io: a long-lived two-way connection between each browser tab and the server.
// HTTP is "client asks, server answers". A socket lets the SERVER push data whenever it wants:
// new messages, typing indicators, notifications.
//
// Events the client can SEND:      Events the server PUSHES:
//   message:send   { conversationId, text }   → message:new     { message }
//   typing         { conversationId, isTyping } → typing        { conversationId, userId, isTyping }
//   messages:read  { conversationId }          → messages:read { conversationId, userId }
//                                               notification:new (from notification.service)
import { Server } from "socket.io";
import { COOKIE_NAME, verifyToken } from "../utils/token.js";
import { accountExists } from "../middleware/auth.js";
import { messageSchema } from "../validators/chat.schema.js";
import * as chatService from "../services/chat.service.js";
import { emitToUsers, setIO } from "./emitter.js";

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf("=");
        return [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
      })
  );
}

// Wraps an event handler: catches errors and answers the client's acknowledgement callback.
// ack({ ok: true, ...data })  or  ack({ ok: false, error: "message" })
function handle(fn) {
  return async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    try {
      reply({ ok: true, ...(await fn(payload ?? {})) });
    } catch (err) {
      if (!err.status) console.error("Socket error:", err);
      reply({ ok: false, error: err.status ? err.message : "Something went wrong" });
    }
  };
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Socket middleware: runs once when a client connects.
  // The browser sends our httpOnly JWT cookie with the connection request, so we log in
  // exactly like requireAuth does for REST. No token → connection refused.
  // Two ways to log in:
  //   1. handshake.auth.token: a 2-minute socket token from GET /api/auth/socket-token.
  //      This is what the browser app uses (works when the API is on another domain, as in production).
  //   2. the session cookie: works when the socket connects to the same site that set the cookie
  //      (scripts and tests use this).
  io.use(async (socket, next) => {
    try {
      const socketToken = socket.handshake.auth?.token;
      const cookieToken = parseCookies(socket.handshake.headers.cookie)[COOKIE_NAME];
      if (socketToken) socket.data.userId = verifyToken(socketToken, "socket").sub;
      else if (cookieToken) socket.data.userId = verifyToken(cookieToken, "session").sub;
      else return next(new Error("unauthorized"));
      // Same as requireAuth: a valid token for a deleted account doesn't get in.
      if (!(await accountExists(socket.data.userId))) return next(new Error("unauthorized"));
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    // A private room per user: every tab/device of this user joins it.
    socket.join(`user:${userId}`);

    socket.on(
      "message:send",
      handle(async ({ conversationId, text, clientId }) => {
        const parsed = messageSchema.safeParse({ text });
        if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0].message), { status: 400 });

        const { message, participants } = await chatService.sendMessage(conversationId, userId, parsed.data.text);
        // Both people (all their tabs) get it, including the sender's other tabs.
        // clientId lets the sender swap their temporary "sending…" bubble for the saved message.
        emitToUsers(participants, "message:new", { message, clientId: typeof clientId === "string" ? clientId : null });
        return { message };
      })
    );

    // Typing events must arrive in the order they were sent. Each one does an async DB lookup,
    // and two lookups can finish in either order: "stopped" could overtake "started" and leave
    // the indicator stuck on. Chaining them on one promise per socket keeps them in order.
    let typingQueue = Promise.resolve();
    const relayTyping = handle(async ({ conversationId, isTyping }) => {
      const conv = await chatService.getConversationForUser(conversationId, userId);
      const others = conv.participants.filter((id) => id !== userId);
      // Typing isn't saved anywhere: it's only relayed live.
      emitToUsers(others, "typing", { conversationId, userId, isTyping: Boolean(isTyping) });
      return {};
    });
    socket.on("typing", (payload, ack) => {
      typingQueue = typingQueue.then(() => relayTyping(payload, ack));
    });

    socket.on(
      "messages:read",
      handle(async ({ conversationId }) => {
        const { updated, participants } = await chatService.markRead(conversationId, userId);
        emitToUsers(participants, "messages:read", { conversationId, userId });
        return { updated };
      })
    );
  });

  setIO(io);
  return io;
}
