// MongoDB connection through Mongoose.
import dns from "node:dns";
import mongoose from "mongoose";

export async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️  MONGO_URI is not set, skipping MongoDB connection");
    return;
  }

  // A "mongodb+srv://" address needs a DNS "SRV" lookup to find the Atlas servers.
  // Some Windows setups/routers refuse SRV lookups from Node (error: querySrv ECONNREFUSED).
  // DNS_SERVERS in .env (e.g. "8.8.8.8,1.1.1.1") makes Node use public DNS for these lookups.
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    // Make sure every index in our schemas exists (e.g. the unique { postId, userId } index on likes)
    // before we start handling requests. Mongoose builds them in the background otherwise.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}

export function checkMongo() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
}
