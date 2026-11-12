// @mentions: find "@username" in a post or comment and notify those people.
//
// Rules:
//   - only real usernames count (looked up in PostgreSQL); "@nobody" is just text
//   - "me@example.com" is not a mention (the @ must not follow a letter or number)
//   - you never get notified for mentioning yourself
//   - in a PRIVATE group, only active members are notified: everyone else couldn't open the post
//     anyway, and the notification would leak that it exists
//   - at most 10 people per post/comment, so one post can't spam the whole site
import { prisma } from "../config/prisma.js";
import { createNotification } from "./notification.service.js";
import { getMembership, isActiveMember } from "./group.access.js";

export const MAX_MENTIONS = 10;
const MENTION = /(?<![a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;

export function extractMentions(text = "") {
  const names = new Set();
  for (const [, name] of text.matchAll(MENTION)) {
    names.add(name.toLowerCase());
    if (names.size === MAX_MENTIONS) break;
  }
  return [...names];
}

// skipUserIds: people who already get a notification for this action (e.g. the post author on a comment).
// skipUsernames: people mentioned before (when a post is edited), so they aren't notified twice.
export async function notifyMentions({ text, actorId, post, skipUserIds = [], skipUsernames = [] }) {
  const usernames = extractMentions(text).filter((u) => !skipUsernames.includes(u));
  if (usernames.length === 0) return [];

  let users = await prisma.user.findMany({ where: { username: { in: usernames } }, select: { id: true } });
  users = users.filter((u) => u.id !== actorId && !skipUserIds.includes(u.id));

  if (post.groupId && users.length > 0) {
    const group = await prisma.group.findUnique({ where: { id: post.groupId }, select: { isPrivate: true } });
    if (!group) return [];
    if (group.isPrivate) {
      const members = await Promise.all(users.map((u) => getMembership(post.groupId, u.id)));
      users = users.filter((u, i) => isActiveMember(members[i]));
    }
  }

  await Promise.all(
    users.map((u) => createNotification({ userId: u.id, type: "mention", actorId, postId: post._id }))
  );
  return users.map((u) => u.id);
}
