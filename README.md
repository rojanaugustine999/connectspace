<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-dark.svg">
    <img src="docs/brand/logo-light.svg" alt="ConnectSpace" width="300">
  </picture>
</p>

<p align="center">
  <strong>A real-time social app: follow people, share posts, chat live and build communities.</strong><br>
  Next.js · Express · PostgreSQL · MongoDB · Socket.io
</p>

<p align="center">
  <a href="https://connectspace-opal.vercel.app"><strong>Live demo</strong></a> ·
  <a href="docs/CASE_STUDY.md">Case study</a> ·
  <a href="docs/API.md">API reference</a> ·
  <a href="DEPLOY.md">Deployment guide</a>
</p>

<p align="center">
  <img src="docs/screenshots/home.png" alt="ConnectSpace home page with the latest posts" width="900">
</p>

> **Try it:** log in as `alice@demo.test` / `password123` (a shared demo account; anything you post is public).
> The free API server sleeps when idle, so the first load can take up to a minute.

## Features

- **Accounts:** sign up, log in, profile photo and bio. Passwords hashed with bcrypt; JWT in an `httpOnly` cookie
- **Social graph:** follow and unfollow, followers/following lists, people search
- **Feed:** posts from people you follow, with **infinite scroll**, photos (up to 4), likes and threaded comments
- **Real time:** one-to-one chat with **typing indicators** and **read receipts**, plus **live notifications** and unread badges (Socket.io)
- **Groups:** public or private, owner/admin/member roles, join requests, group-only posts
- **Production details:** per-visitor rate limiting, private content hidden as 404, image type checks, graceful shutdown

## Screenshots

| Profile | People |
|---|---|
| <img src="docs/screenshots/profile.png" alt="Profile page"> | <img src="docs/screenshots/people.png" alt="People search"> |

| Sign up | On a phone |
|---|---|
| <img src="docs/screenshots/signup.png" alt="Sign-up form"> | <img src="docs/screenshots/mobile-profile.png" alt="Profile on a phone" width="260"> |

## Architecture

```mermaid
flowchart LR
  B([Browser]) -->|pages + /api/*| V["Vercel<br/>Next.js 15 (React 19)"]
  V -->|"proxy /api/* + signed visitor IP"| R["Render<br/>Express 5 API"]
  B <-->|"Socket.io (2-min token)"| R
  R -->|Prisma| P[("PostgreSQL · Neon<br/>users · follows · groups")]
  R -->|Mongoose| M[("MongoDB · Atlas<br/>posts · comments · likes<br/>chats · notifications")]
  R --> C[("Cloudinary<br/>images")]
```

- The browser only talks to **one site** (Vercel). Next.js forwards `/api/*` to Express, so the login cookie is first-party and works in Safari.
- **Socket.io** can't go through that proxy, so it connects straight to the API with a short-lived token fetched through it.
- **Two databases, each for what it's good at:** PostgreSQL for relationships that need strict rules, and MongoDB for high-volume, flexible documents. The API merges them (no cross-database JOIN), always with a fixed number of queries.

### A request, step by step

```mermaid
sequenceDiagram
  participant UI as React page
  participant N as Next.js proxy
  participant E as Express
  participant PG as PostgreSQL
  participant MG as MongoDB
  UI->>N: GET /api/posts/feed?cursor=…
  N->>E: forward (+ visitor IP, signed)
  E->>E: requireAuth: check JWT cookie
  E->>PG: who does this user follow?
  E->>MG: their posts, newest first (limit 11)
  E->>PG: authors' names + avatars (1 query)
  E-->>UI: { posts: [10], nextCursor }
```

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| API | Node.js, Express 5, Zod validation, Socket.io, Multer |
| Data | PostgreSQL + Prisma 6 (Neon), MongoDB + Mongoose (Atlas), Cloudinary |
| Security | bcrypt, JWT (`httpOnly` cookie), Helmet, express-rate-limit |
| Hosting | Vercel (website), Render (API, `render.yaml` blueprint) |

## Engineering highlights

| Problem | Solution |
|---|---|
| Two likes at the same moment | Unique index `{ postId, userId }` + atomic `$inc` counter |
| Posts skipped while scrolling | Cursor pagination on `createdAt` **and** `_id` |
| Feed queries growing per post (N+1) | Load authors and "liked by me" for a whole page in one query each |
| Private group posts leaking | Every read, like and comment path checks access; outsiders get 404 |
| Fake uploads | Check the file's real bytes (magic numbers), cap at 5 MB, random file names |
| Rate limits shared by everyone behind proxies | Proxy signs the visitor IP with a shared secret; hop count measured |
| Chat "Sending…" bubbles duplicating | Client-generated `clientId` echoed by the server |

The full story, from a UI/UX point of view, is in the **[case study](docs/CASE_STUDY.md)**.

## Run it locally

You need Node.js 20+, a PostgreSQL database and a MongoDB database (the free tiers of [Neon](https://neon.tech) and [Atlas](https://www.mongodb.com/atlas) work).

```bash
git clone https://github.com/rojanaugustine999/connectspace.git
cd connectspace
```

```bash
cd server
cp .env.example .env          # fill in DATABASE_URL, MONGO_URI, JWT_SECRET
npm install
npx prisma migrate deploy     # create the PostgreSQL tables
npm run db:seed               # demo users, follows, posts and likes
npm run dev                   # API on http://localhost:5000
```

```bash
cd client
cp .env.example .env.local
npm install
npm run dev                   # website on http://localhost:3000
```

Open http://localhost:3000 and log in as `alice@demo.test` / `password123`.
http://localhost:3000/status shows whether the API and both databases are connected.

## Project structure

```
client/                 Next.js website
  app/                  pages (feed, profiles, posts, messages, groups, settings…)
  components/           PostCard, ChatWindow, FollowButton, Logo…
  lib/                  api helper, auth + socket contexts
  middleware.js         passes the signed visitor IP to the API
server/                 Express API
  prisma/               PostgreSQL schema, migrations, seed script
  src/routes/           URL → middleware → controller
  src/services/         business logic (feed, chat, groups, uploads…)
  src/models/           MongoDB models
  src/socket/           Socket.io: login, chat, typing, live events
docs/                   case study, API reference, screenshots, brand
render.yaml             Render blueprint for the API
```

## Documentation

- **[Case study](docs/CASE_STUDY.md):** design goals, decisions and lessons learned
- **[API reference](docs/API.md):** REST routes, Socket.io events and error codes
- **[Deployment guide](DEPLOY.md):** Neon, Atlas, Cloudinary, Render and Vercel, step by step

## Credits

Designed and built by **[Rojan Augustine](https://github.com/rojanaugustine999)**, a UI/UX designer and frontend developer learning the full stack, with Claude (Claude Code) as a pair programmer.
