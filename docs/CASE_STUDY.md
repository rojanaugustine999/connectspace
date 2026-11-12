# Case study: ConnectSpace

> **A designer learning the backend by building a real-time social app end to end.**
> Role: product design, frontend and backend · Built: November 2026 · [Live site](https://connectspace-opal.vercel.app)

![ConnectSpace home](screenshots/home.png)

## Why I built it

I'm a UI/UX designer and frontend developer. My earlier projects ([TripNest](https://tripnest-travel-booking-platform.vercel.app/), [Amazon product listing](https://amazon-product-listing-roj.vercel.app/)) were interfaces on top of fake data. I wanted to understand what happens **behind the screen**: where data lives, how a login really works, and what makes "real time" real.

So I set myself one constraint: **every interaction must be backed by a real server and a real database, and deployed for anyone to use.**

## Goals

| For people using it | For me as a learner |
|---|---|
| Feel instant, even on a slow connection | Design a database, not just a screen |
| Never hit a dead end (empty, error and loading states) | Learn REST, auth, WebSockets and deployment |
| Work equally well on a phone | Make deliberate trade-offs and explain them |
| Keep private things private | Ship something people can actually use |

## Design principles, and how the backend made them possible

### 1. Feel instant

| Home feed | Live notifications |
|---|---|
| <img src="screenshots/feed.png" width="320" alt="Home feed with photo posts"> | <img src="screenshots/notifications.png" alt="Notifications showing new followers"> |

**The same chat in two browsers:** my message is marked "Seen" the moment Alice opens it.

<img src="screenshots/chat-you.png" alt="My view of the chat with Alice, message marked Seen">
<img src="screenshots/chat-alice.png" alt="Alice's view of the same chat in another browser">

Likes, follows and chat messages update the UI **before** the server answers (optimistic UI) and roll back if the request fails. The design idea needed backend support: likes use an atomic `$inc` plus a unique index, so double-taps can't double-count. Chat messages carry a `clientId`, so the "Sending…" bubble is swapped for the saved message without duplicates.

### 2. Never a dead end
Every list has three designed states: **loading** (skeletons, not spinners), **empty** (an invitation: "Find people to follow", not "No data"), and **error** (a message plus **Try again**). Failed chat messages show **Not sent: Retry** in place. The API sends human-readable errors, so the UI can show them as they are.

### 3. Accessible by default
- The Follow button is a real toggle (`aria-pressed`) with a stable label ("Follow @alice"). Its "Unfollow" hover text only appears on devices with a mouse, because a tap on a phone would leave it stuck.
- Form errors are linked to their inputs (`aria-invalid` and `aria-describedby`), and unread badges include screen-reader text ("3 unread").
- Phone nav icons are labelled links, not decorative emoji.
- The account menu on the avatar (View profile, Edit profile, Log out) follows the WAI-ARIA menu button pattern: Enter opens it and focuses the first item, arrow keys move and wrap, Escape closes it and returns focus to the avatar.

### 4. Mobile first

| Profile on a phone | Home on a phone |
|---|---|
| <img src="screenshots/mobile-profile.png" width="260" alt="Profile on a phone"> | <img src="screenshots/mobile-home.png" width="260" alt="Home on a phone"> |

Messages switch from two panes (desktop) to list → chat (phone). The nav collapses to the logo mark plus line icons.

### 5. One visual language
One accent blue, one icon style (2px line icons), one avatar component that shows the person's photo or a colour taken from their username, so the same person always gets the same colour.

### 6. Colours as design tokens, so dark mode is free
Components never use raw colours. They use named tokens like `surface`, `line`, `link` and `danger`, and light and dark are two sets of values for the same names. The site follows the device setting, and the account menu lets people choose Auto, Light or Dark (saved on their device and applied before the page paints, so there's no white flash). The same tokens are exported to [design-tokens.json](design-tokens.json), ready to import as Figma variables with a light and a dark mode, so design and code share one source of truth.

| Dark mode | @mention suggestions |
|---|---|
| <img src="screenshots/dark-feed.png" alt="Home feed in dark mode"> | <img src="screenshots/dark-mentions.png" alt="Typing @ali suggests Alice Johnson"> |

The @mention list is an accessible combobox: arrow keys move through people, Enter picks one, Escape closes it, and screen readers hear who is highlighted. On the server, only real usernames count, and in a private group only members are notified, so a notification never reveals a post someone can't open.

### 7. Search that explains itself
<img src="screenshots/search.png" width="600" alt="Searching 'macaw' finds Alice's post with the word highlighted">

One Search page with **People** and **Posts** tabs, instead of two separate pages. Posts are found with a MongoDB text index, which matches whole words and their stems ("walks" finds "walking") and ranks the best match first. Because that's different from how people expect a search box to behave, the design does the explaining: the matching words are **highlighted** so you can see *why* a post was found, and the empty states teach the rule ("Try a whole word instead of part of one"). The search lives in the URL, so a search can be shared and the Back button works. Private group posts only appear for members, using the same rule as everywhere else.

### 8. Leaving should be as clear as joining
Anyone can delete their account from Settings, with the same two-step pattern GitHub and Google use for destructive actions: a plain button that only opens the form, then a list of exactly what will be deleted and a password to confirm. Afterwards a short page confirms it's done.

Behind that one button, the server cleans up **two databases and an image store**. PostgreSQL removes follows and group memberships by itself, but MongoDB has no foreign keys, so posts, comments, likes, notifications and conversations are deleted by hand, and the like and comment counts on other people's posts are recounted. Groups the person owned pass to the longest-serving admin (or member), and groups with nobody left are deleted. The order is deliberate: MongoDB and photos first, the PostgreSQL account **last**, so if anything fails halfway the account still exists and the person can simply try again.

## The brand

<img src="brand/logo-mark.svg" width="56" alt="ConnectSpace logo mark"> **Two interlocking rings: two people, one shared space.**

I compared three concepts (an orbiting "C", a chat bubble with nodes, and overlapping rings) and tested each at **16 px**, where favicons live. The rings were the calmest and most recognisable small. Interlocking them like chain links turned "overlap" into "connected". The mark comes as a browser tab icon, phone home-screen icon and a 1200×630 social preview image.

## Architecture, explained simply

```mermaid
flowchart LR
  U([Browser]) -->|pages + /api| V[Vercel · Next.js]
  V -->|proxy /api| R[Render · Express API]
  U <-->|Socket.io, live| R
  R --> P[(PostgreSQL · Neon<br/>people and relationships)]
  R --> M[(MongoDB · Atlas<br/>posts, chats, notifications)]
  R --> C[(Cloudinary<br/>images)]
```

**Why two databases?** People and their relationships (follows, group roles) need strict rules: no duplicate follows, one owner per group. That's what **PostgreSQL** is built for. Posts, comments, chats and notifications are high-volume, flexible documents, which suits **MongoDB**. The trade-off: the two can't JOIN, so the API fetches posts from MongoDB, then their authors from PostgreSQL **in a single query**, and merges them.

## Problems I hit, and what they taught me

| What I saw | What was really happening | Fix |
|---|---|---|
| MongoDB wouldn't connect on Windows | My router refused the special DNS lookup Atlas uses | Point Node at public DNS for that lookup |
| Some posts never appeared while scrolling | Posts with the **same timestamp** were skipped by the page cursor | Cursor of `createdAt` **plus** `_id` |
| "Typing…" sometimes got stuck on | "Stopped typing" overtook "started typing" on the server | Process each user's typing events in order |
| Every request happened twice | A header triggered an extra CORS "preflight" request | Only send `Content-Type` when there's a body |
| Login would fail on iPhones | Third-party cookies are blocked by Safari | Proxy the API through the website's own domain |
| Photo uploads said "Something went wrong" | Wrong Cloudinary secret, and a vague error message | Fixed the secret; expected errors now say what happened |
| Rate limits were shared by everyone | The server saw proxy IPs, not visitors | Signed visitor IP from the proxy, measured hop count |
| A deleted account could still post from another device | A login token stays valid for 7 days, and only its signature was checked | Every login check (and live connection) also confirms the account still exists |
| "Couldn't load posts" after a quiet hour | The free API server sleeps and takes ~55 s to wake | Auto-retry plus a "Waking up the server…" notice with a seconds counter; a scheduled GitHub Action pings it every 5 minutes to keep it awake |

The biggest lesson: **a vague error message is a design problem.** Half of these took longer than needed because something said "Something went wrong" instead of what actually happened.

## Measuring it: an accessibility and speed audit

I checked the live site with **axe** (accessibility rules, run on 9 pages in both light and dark mode) and **Lighthouse** (Google's 0–100 scores), then fixed what they found and measured again.

| | Before | After |
|---|---|---|
| axe issues (9 pages × 2 themes) | 25, on 5 pages | **0** |
| Lighthouse accessibility | 91–96 | **100** on every page tested |
| Lighthouse SEO | 91–100 | **100** |
| Performance, home page on a phone | 60 | **93** |
| Performance, home page on desktop | 78 | **99** |
| Layout shift, home page on a phone (good is under 0.1) | 0.38 | **0** |

What the fixes were:

- **Avatar links had no name.** A screen reader heard just "link", up to 10 times on the home page. The avatar sits next to the person's name, which already links to the same profile, so the avatar is now skipped by keyboard and screen readers: one clear link instead of two.
- **Faint text** ("You're all caught up", message times) was 3.4:1 against the background; text needs 4.5:1. Slightly darker now, in both themes.
- **The post page had no main heading** for screen-reader users to jump to.
- **The home page downloaded 4.9 MB**, mostly full-size photos shown in a 550 px column. Photos now come from Cloudinary resized to the size they're shown at and in modern formats (WebP/AVIF), and avatars at their small display size.
- **The page jumped while photos loaded.** Photos now have a fixed shape (4:3, or squares when there are several), so their space is reserved before they arrive, and the first one loads first.

What's left on purpose: when you're logged out, the site asks the API "who am I?" and gets "not logged in", which the browser logs as an error (Best practices 96).

### Round two: posts in the first paint

After the audit, posts still appeared about 3 s after the page on a phone: the browser first loaded the page, then asked "who am I?", and only then asked for posts. For **logged-out visitors** (recruiters opening the demo, people arriving from a shared link) the website's own server now fetches the first posts and sends them **inside the page**. It can tell a guest from a logged-in person by the login cookie, which JavaScript can't read but the server can. Logged-in pages are unchanged, because their content depends on who you are.

Two safety rules: the server asks the API as a logged-out visitor, so private group posts are never sent, and it waits at most 3 seconds; if the free API is asleep, the page falls back to loading posts in the browser. The same server step also writes each post's and profile's **link preview** (title, text and photo for WhatsApp, LinkedIn and Slack).

| Phone, live site (Lighthouse) | Before | After |
|---|---|---|
| Performance (home, profile, post) | 94–95 | **99–100** |
| Main photo shown (LCP) | 2.9–3.0 s | **1.8–2.0 s** |
| Page looks complete (Speed Index) | 1.8–3.0 s | **1.3–1.6 s** |

## Outcome

- **Live** on Vercel (website) and Render (API), with PostgreSQL, MongoDB and Cloudinary
- **Accessibility 100, and performance 99–100 on a phone for the home, profile and post pages,** in Lighthouse on the live site, with 0 axe issues in light and dark mode
- Sign-up and login, profiles, follows, a feed with infinite scroll, posts with photos (editable afterwards, with an "edited" label), likes, threaded comments, **real-time chat** with typing indicators and read receipts, **live notifications**, **@mentions**, **post search**, link previews for shared posts and profiles, light and dark themes, **public and private groups** with roles, and **account deletion** that cleans up both databases
- **57 automated API tests** run on every push in GitHub Actions, against throwaway PostgreSQL and MongoDB databases. They include security checks (faked IP addresses, disguised image files, outsiders opening private group posts) and real-time checks with real Socket.io clients

## What I'd do next

1. Usability-test with five people, focusing on search, @mentions and group privacy. The [test kit](usability-test/README.md) (script, six tasks, notes sheet and findings template) is ready
2. Separate development and live databases
3. Spacing and type tokens, to finish the design system started with colour

## How I built it

I built ConnectSpace week by week with **Claude (Claude Code) as a pair programmer**: it explained concepts, proposed code and ran tests, while I made the product and design decisions, set up and deployed every service, and tested the app as a user. Working this way, I learned to read and question backend code, not just write UI.
