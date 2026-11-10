# ConnectSpace

A social / community app for learning full-stack development.

| Part | Tech | Folder |
|---|---|---|
| Frontend | Next.js (React) + Tailwind | `client/` |
| API | Node.js + Express | `server/` |
| Relational data | PostgreSQL via Prisma | `server/prisma/schema.prisma` |
| Flexible data | MongoDB via Mongoose | `server/src/models/` |

**PostgreSQL:** users, follows, groups, memberships
**MongoDB:** posts, comments, likes, chats, messages, notifications

## Request flow

```
Browser (React) → fetch → Express route → middleware → controller → service → Prisma / Mongoose → DB
                                                                                       ↓
Browser ← JSON response ←──────────────────────────────────────────────────────────────┘
```

## Run it (two terminals)

```bash
# Terminal 1: API on http://localhost:5000
cd server
npm run dev
```

```bash
# Terminal 2: website on http://localhost:3000
cd client
npm run dev
```

Open http://localhost:3000. The browser only talks to :3000; Next.js forwards `/api/*` to the API on :5000 (see `client/next.config.mjs`).
http://localhost:3000/status shows whether the API, PostgreSQL and MongoDB are connected.

Copy `client/.env.example` to `client/.env.local` (and `server/.env.example` to `server/.env`) first.

## Databases

Set `DATABASE_URL` and `MONGO_URI` in `server/.env` (see `server/.env.example`).

- **PostgreSQL:** free cloud database at https://neon.tech, or install locally
- **MongoDB:** free cloud cluster at https://www.mongodb.com/atlas, or install locally

Then create the PostgreSQL tables:

```bash
cd server
npm run db:migrate -- --name init
```

`npm run db:studio` opens a visual browser for your PostgreSQL tables.

## Demo users

```bash
cd server
npm run db:seed
```

Creates alice, bob, chen, divya and emma with follows (PostgreSQL) and 17 posts + likes (MongoDB). Safe to run again.
Log in as `<username>@demo.test` with password `password123`.

## API

| Method | Route | Auth |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | – |
| GET | `/api/auth/me` | required |
| GET | `/api/users/search?q=` | optional |
| PATCH | `/api/users/me` | required |
| GET | `/api/users/:username` | optional |
| POST / DELETE | `/api/users/:username/follow` | required |
| GET | `/api/users/:username/followers?page=` · `/following?page=` | optional |
| GET | `/api/notifications` · `/unread-count` | required |
| PATCH | `/api/notifications/read` | required |
| POST | `/api/posts` | required |
| GET / DELETE | `/api/posts/:id` | optional / author only |
| POST / DELETE | `/api/posts/:id/like` | required |
| GET / POST | `/api/posts/:id/comments` | optional / required |
| DELETE | `/api/posts/:id/comments/:commentId` | comment or post author |
| GET | `/api/users/:username/posts?cursor=` | optional |
| GET | `/api/posts/feed?cursor=` | required |
| GET | `/api/posts/explore?cursor=` | optional |
| GET / POST | `/api/conversations` (POST `{ username }` opens or creates a chat) | required |
| GET | `/api/conversations/unread-count` | required |
| GET | `/api/conversations/:id` · `/:id/messages?cursor=` | participants only |
| POST | `/api/conversations/:id/messages` · `/:id/read` | participants only |

### Groups and uploads

| Method | Route | Who |
|---|---|---|
| GET / POST | `/api/groups?q=` / `/api/groups` | anyone / logged in |
| GET | `/api/groups/mine` | logged in |
| GET · PATCH · DELETE | `/api/groups/:slug` | anyone · admins · owner |
| POST / DELETE | `/api/groups/:slug/join` (join, request, leave, cancel) | logged in |
| GET | `/api/groups/:slug/members[?status=PENDING]` | viewers / admins |
| POST | `/api/groups/:slug/members/:userId/approve` | admins |
| PATCH | `/api/groups/:slug/members/:userId` `{ role }` | owner |
| DELETE | `/api/groups/:slug/members/:userId` (remove / reject) | admins |
| GET / POST | `/api/groups/:slug/posts` | viewers / members |
| POST | `/api/uploads/image?folder=avatars\|posts` (multipart, field `image`) | logged in |

Group posts never appear in profiles, the home feed or explore. Posts in private groups return 404 to non-members.
Images are stored in `server/uploads/` in development, or on Cloudinary when `CLOUDINARY_URL` is set.

## Socket.io events (same port as the API, logged in with the JWT cookie)

| Client sends | Server pushes |
|---|---|
| `message:send` `{ conversationId, text, clientId }` (with ack) | `message:new` `{ message, clientId }` |
| `typing` `{ conversationId, isTyping }` | `typing` `{ conversationId, userId, isTyping }` |
| `messages:read` `{ conversationId }` | `messages:read` `{ conversationId, userId }` |
| | `notification:new` `{ notification }` |

## Roadmap

1. ✅ Setup: Express, both databases, health check
2. ✅ Auth: register, login, JWT cookie
3. ✅ Profiles, follow / unfollow, people search, follow notifications
4. ✅ Posts, likes, comments (with replies)
5. ✅ Home feed + explore + infinite scroll (compound cursor)
6. ✅ Real-time chat, typing, read receipts + live notifications (Socket.io)
7. ✅ Groups (public/private, roles, join requests) + image uploads (local / Cloudinary)
8. ✅ Deploy-ready: Next.js /api proxy (first-party cookie), socket tokens, env checks, render.yaml. See [DEPLOY.md](DEPLOY.md)
