// server.js starts everything: check env → connect databases → start HTTP server + Socket.io.
import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";
import { checkEnv, isProduction } from "./config/env.js";

checkEnv(); // stop right away with a clear message if a required setting is missing

const { default: app } = await import("./app.js");
const { connectMongo } = await import("./config/mongo.js");
const { prisma } = await import("./config/prisma.js");
const { initSocket } = await import("./socket/index.js");

const PORT = process.env.PORT || 5000;

await connectMongo();

// Express (REST) and Socket.io share ONE HTTP server and ONE port.
const server = http.createServer(app);
const io = initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT} (${isProduction ? "production" : "development"})`);
  console.log(`   Health check: /api/health · Socket.io on the same port`);
});

// Graceful shutdown: Render sends SIGTERM before every redeploy/restart; Ctrl+C sends SIGINT.
// Stop accepting new connections, let running requests finish, then close the databases.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down…`);
  setTimeout(() => process.exit(1), 10_000).unref(); // don't hang forever
  io.close(); // disconnects sockets (clients auto-reconnect to the new server)
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), mongoose.disconnect()]);
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
