// Creates demo users, follows (PostgreSQL) and demo posts + likes (MongoDB),
// so there's something to see while developing.
// Run: npm run db:seed   (safe to run again: existing users/posts are left as they are)
//
// Every demo account logs in with:  <username>@demo.test  /  password123
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import { connectMongo } from "../src/config/mongo.js";
import { Post } from "../src/models/Post.js";
import { Like } from "../src/models/Like.js";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

const demoUsers = [
  { username: "alice", name: "Alice Johnson", bio: "Product designer. Coffee, typography and long walks." },
  { username: "bob", name: "Bob Martin", bio: "Backend dev who secretly loves CSS." },
  { username: "chen", name: "Chen Wei", bio: "Photographer & UI tinkerer 📷" },
  { username: "divya", name: "Divya Nair", bio: "Frontend engineer from Kochi. React all day." },
  { username: "emma", name: "Emma Rossi", bio: "Learning full-stack, one bug at a time." },
];

// [follower, following]
const demoFollows = [
  ["alice", "bob"],
  ["bob", "alice"],
  ["chen", "alice"],
  ["divya", "alice"],
  ["divya", "bob"],
  ["emma", "divya"],
];

// [author, text, hours ago]
const demoPosts = [
  ["alice", "Spent the morning fixing 4px of misalignment. Worth it.", 2],
  ["alice", "Hot take: every empty state deserves as much love as the happy path.", 20],
  ["alice", "Finally switched my design tokens to OKLCH. Dark mode just… works now.", 50],
  ["alice", "Reminder: a button that looks disabled but isn't is a bug, not a style.", 96],
  ["bob", "Added a unique index and a whole class of race-condition bugs disappeared. Databases are magic.", 1],
  ["bob", "TIL: Express 5 catches errors from async route handlers automatically. No more try/catch everywhere.", 26],
  ["bob", "Cursor pagination > offset pagination. Fight me.", 70],
  ["bob", "Postgres for relationships, Mongo for flexible documents. Why not both?", 120],
  ["chen", "Golden hour over Fort Kochi today 🌅", 5],
  ["chen", "Shooting UI screenshots is harder than shooting landscapes. The light never changes, but the bugs do.", 30],
  ["chen", "New camera strap. Life changing. (Not really, but it's very orange.)", 80],
  ["divya", "useEffect cleanup functions finally clicked for me today.", 3],
  ["divya", "Built a debounced search input. 1 request instead of 12 per word 🎉", 28],
  ["divya", "Kochi tech meetup this Saturday, who's coming?", 60],
  ["divya", "Accessibility tip: if you remove the focus outline, give it something better, not nothing.", 100],
  ["emma", "Week 4 of learning full-stack: I understand what a JWT is now!", 8],
  ["emma", "Why does every tutorial skip error handling 😅", 40],
];

// [who likes, author, post index within that author's posts]
const demoLikes = [
  ["bob", "alice", 0],
  ["chen", "alice", 0],
  ["divya", "alice", 0],
  ["alice", "bob", 0],
  ["divya", "bob", 0],
  ["alice", "chen", 0],
  ["emma", "divya", 1],
  ["alice", "divya", 3],
];

async function seedPostgres() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, email: `${u.username}@demo.test`, password },
    });
  }

  const users = await prisma.user.findMany({
    where: { username: { in: demoUsers.map((u) => u.username) } },
    select: { id: true, username: true },
  });
  const idOf = Object.fromEntries(users.map((u) => [u.username, u.id]));

  const { count } = await prisma.follow.createMany({
    data: demoFollows.map(([a, b]) => ({ followerId: idOf[a], followingId: idOf[b] })),
    skipDuplicates: true,
  });
  console.log(`✅ ${users.length} demo users ready, ${count} new follows`);
  return idOf;
}

async function seedMongo(idOf) {
  const demoIds = Object.values(idOf);
  const existing = await Post.countDocuments({ authorId: { $in: demoIds } });
  if (existing > 0) {
    console.log(`ℹ️  Demo users already have ${existing} posts, skipping demo posts`);
    return;
  }

  const now = Date.now();
  const created = await Post.insertMany(
    demoPosts.map(([author, content, hoursAgo]) => {
      const at = new Date(now - hoursAgo * 60 * 60 * 1000);
      return { authorId: idOf[author], content, createdAt: at, updatedAt: at };
    })
  );

  const postsBy = {};
  demoPosts.forEach(([author], i) => (postsBy[author] ??= []).push(created[i]));

  for (const [liker, author, index] of demoLikes) {
    const post = postsBy[author][index];
    await Like.create({ postId: post._id, userId: idOf[liker] });
    await Post.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
  }
  console.log(`✅ ${created.length} demo posts and ${demoLikes.length} likes created`);
}

async function main() {
  const idOf = await seedPostgres();
  await connectMongo();
  if (mongoose.connection.readyState === 1) await seedMongo(idOf);
  else console.log("⚠️  MongoDB not connected, skipped demo posts");
  console.log(`   Log in as e.g. alice@demo.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });
