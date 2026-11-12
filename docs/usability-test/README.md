# ConnectSpace usability test kit

A small, moderated test with **5 people, about 20 minutes each**. Five people usually reveal most of the big problems in a flow, so this is enough to find what to fix first.

**What's in this folder**

- This page: goals, setup, the script to read out, the tasks and the follow-up questions
- [notes-sheet.md](notes-sheet.md): one copy per person, filled in during the session
- [findings.md](findings.md): where everything comes together afterwards

---

## 1. What we want to learn

1. Can a new visitor **sign up and find people or posts** without help? (Search now has People and Posts tabs. Do people notice the tabs?)
2. Do people understand **private groups**: that they have to ask, that they're waiting, and when they're in?
3. Do **@mentions** feel natural? Do people discover the suggestion list?
4. Can people find the **theme switch** in the account menu?
5. What feels confusing, slow or missing, in their own words?

## 2. Who to invite

- 5 people who **haven't used ConnectSpace** (classmates, friends, family)
- A mix if you can: 2–3 who use social apps every day, 1–2 who don't, at least 1 on a phone
- Not other designers or developers only: they notice different things than everyday users

## 3. Before each session

**Once, before all sessions**

- [ ] Log in as yourself and create a **private group** called **ConnectSpace Testers**. You'll approve each person's join request during the session.
- [ ] Make sure you have at least one post that mentions a word people can search for (Alice's "My Talking Macaw" post works).
- [ ] Open https://connectspace-opal.vercel.app once, a few minutes early, so the free server is awake.

**Each session**

- [ ] Fresh browser window (private / incognito) on the participant's device or yours
- [ ] Start on the home page, logged out
- [ ] Your own phone or laptop logged in as you, with **Groups → ConnectSpace Testers → Members** open, ready to approve
- [ ] A copy of the [notes sheet](notes-sheet.md) and a timer
- [ ] If recording the screen: ask first (see the script), and record only the screen

## 4. Script (read this out)

> Thanks for helping. I'm testing a website I built, called ConnectSpace. It's a small social app.
>
> **I'm testing the website, not you.** If something is hard, that's the website's fault, and it's exactly what I need to find. You can't do anything wrong.
>
> Please **think aloud** as you go: say what you're looking at, what you're trying to do, and what you expect to happen. If you get stuck I may not help straight away, because I want to see what you'd do on your own. You can stop at any time.
>
> Anything you post will be **visible on the public site**, so please don't type anything private. You can make up a name.
>
> *(If recording)* Is it OK if I record the screen? Only the screen, and only I will watch it.
>
> Any questions before we start?

While they work:

- Stay quiet. If they ask "what do I do?", reply "**What would you try?**"
- If they're silent, ask "**What are you thinking now?**"
- If they're stuck for about **2 minutes**, help them and mark the task "with help"
- Don't explain the design. Write down what they say, word for word when you can

## 5. Tasks

Read each task out (or hand it over on a card). **Don't use the words on the buttons**: the tasks describe goals, not clicks.

After each task, ask: **"How easy or hard was that, from 1 (very hard) to 5 (very easy)?"**

| # | Task (read out) | Success means | Watch for |
|---|---|---|---|
| 1 | "You've just heard about ConnectSpace. Make yourself an account." | Account created, lands on the home feed | Do they understand the username rules? Any errors? |
| 2 | "Someone on here posted about a **macaw**. Find that post, then make sure you'll see that person's future posts." | Finds the post via Search → Posts, follows Alice | Do they notice the **Posts** tab, or only search People? Do they type the whole word? Do they find Follow on the profile? |
| 3 | "Leave a comment on the macaw post that makes sure **Rojan** gets notified about it." | A comment containing `@rojanaugustine999` | Do they think of typing @? Do they see the suggestion list? Do they pick from it, or type the full username? |
| 4 | "There's a private group called **ConnectSpace Testers**. Get into it and say hello to the group." | Requests to join, is approved by you, posts in the group | Do they understand **Requested** means waiting? Do they notice when they're let in? (Approve about 20 seconds after they ask.) |
| 5 | "Send Rojan a private message saying thanks." | Message sent in Messages | Do they go through the profile's Message button or the Messages page? |
| 6 | "You prefer the site to always look dark, whatever your device is set to. Change that." | Account menu → Theme → Dark | Do they look in the avatar menu? Do they understand Auto? |

## 6. After the tasks (5 minutes)

1. "What was the **easiest** part, and what was the **most frustrating**?"
2. "Was there anything you **expected to find but couldn't**?"
3. "If you could change **one thing**, what would it be?"

Thank them. If they'd like their test account removed, they can do it themselves in **Settings → Delete account** (this is also a good last look at a flow you haven't tested: note anything that makes them hesitate).

## 7. After all five sessions

1. Copy every problem from the notes sheets into [findings.md](findings.md), one row each.
2. Count how many people hit each problem, and give it a severity:
   - **High**: they failed the task or needed help
   - **Medium**: they got there, but were slow, confused or annoyed
   - **Low**: a small comment or wish
3. Fix the high ones first (that's the next coding step), then re-test the same task with 1–2 new people.
4. Add a **"What testing taught me"** section to the case study: the problem, what people said, the fix, and before/after screenshots.
