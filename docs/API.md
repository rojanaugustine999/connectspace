# ConnectSpace API reference

REST API served by Express at `/api/*`. The website calls it through the Next.js proxy (same site),
so authentication is a first-party `httpOnly` cookie. All bodies are JSON unless noted.

## Auth and users

| Method | Route | Auth |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | – (rate limited per visitor) |
| GET | `/api/auth/me` | required |
| GET | `/api/auth/socket-token` (2-minute token for Socket.io) | required |
| GET | `/api/users/search?q=` | optional |
| PATCH | `/api/users/me` | required |
| GET | `/api/users/:username` | optional |
| POST / DELETE | `/api/users/:username/follow` | required |
| GET | `/api/users/:username/followers?page=` · `/following?page=` | optional |
| GET | `/api/users/:username/posts?cursor=` | optional |

## Posts, comments and likes

| Method | Route | Auth |
|---|---|---|
| POST | `/api/posts` | required |
| GET | `/api/posts/feed?cursor=` (people you follow + you) | required |
| GET | `/api/posts/explore?cursor=` (everyone) | optional |
| GET | `/api/posts/search?q=&cursor=` (text search, best match first; cursor is a page number, max 5 pages) | optional |
| GET / DELETE | `/api/posts/:id` | optional / author or group admin |
| POST / DELETE | `/api/posts/:id/like` | required |
| GET / POST | `/api/posts/:id/comments` | optional / required |
| DELETE | `/api/posts/:id/comments/:commentId` | comment or post author |

Lists use **cursor pagination**: each response returns `nextCursor` (`createdAt_id`), which you pass back as `?cursor=`.

## Notifications and chat

| Method | Route | Auth |
|---|---|---|
| GET | `/api/notifications` · `/unread-count` | required |
| PATCH | `/api/notifications/read` | required |
| GET / POST | `/api/conversations` (POST `{ username }` opens or creates a chat) | required |
| GET | `/api/conversations/unread-count` | required |
| GET | `/api/conversations/:id` · `/:id/messages?cursor=` | participants only |
| POST | `/api/conversations/:id/messages` · `/:id/read` | participants only |

## Groups and uploads

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

## Socket.io events

Same server and port as the API. The client logs in with a 2-minute token from `/api/auth/socket-token`.

| Client sends | Server pushes |
|---|---|
| `message:send` `{ conversationId, text, clientId }` (with ack) | `message:new` `{ message, clientId }` |
| `typing` `{ conversationId, isTyping }` | `typing` `{ conversationId, userId, isTyping }` |
| `messages:read` `{ conversationId }` | `messages:read` `{ conversationId, userId }` |
| | `notification:new` `{ notification }` |

## Errors

Every error is `{ "error": "message" }`, plus `"details": { field: message }` for validation errors (400).
Status codes: 400 invalid input · 401 not logged in · 403 not allowed · 404 not found (also used to hide private content) · 409 already exists · 413 file too large · 429 too many attempts · 502 image storage failed.
