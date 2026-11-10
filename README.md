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

Open http://localhost:3000. It shows whether the API, PostgreSQL and MongoDB are connected.

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
7. Groups, image upload, deploy
