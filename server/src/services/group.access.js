// Group permission rules in one place. Used by both group.service and post.service
// (keeping them separate avoids the two services importing each other).
//
//                    view posts    post    approve/remove members    change roles / delete group
//   public group:    everyone
//   private group:   members only
//   MEMBER                          ✓
//   ADMIN                           ✓             ✓ (members only)
//   OWNER                           ✓             ✓ (anyone)                    ✓
import { prisma } from "../config/prisma.js";

export async function getMembership(groupId, userId) {
  if (!userId) return null;
  return prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
}

export const isActiveMember = (m) => m?.status === "ACTIVE";
export const isAdmin = (m) => isActiveMember(m) && (m.role === "OWNER" || m.role === "ADMIN");
export const isOwner = (m) => isActiveMember(m) && m.role === "OWNER";
export const canViewGroup = (group, m) => !group.isPrivate || isActiveMember(m);
