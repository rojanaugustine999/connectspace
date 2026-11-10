// server.js starts everything: load env → connect databases → start HTTP server + Socket.io.
import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { prisma } from "./config/prisma.js";
import { initSocket } from "./socket/index.js";

const PORT = process.env.PORT || 5000;

async function start() {
  await connectMongo();

  // Express (REST) and Socket.io share ONE HTTP server and ONE port.
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Socket.io ready on the same port`);
  });

  // Close database connections cleanly on Ctrl+C.
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

start();
