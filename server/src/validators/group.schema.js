import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters").max(50, "At most 50 characters"),
  description: z.string().trim().max(300, "At most 300 characters").optional(),
  isPrivate: z.boolean().optional().default(false),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters").max(50, "At most 50 characters").optional(),
  description: z.string().trim().max(300, "At most 300 characters").optional(),
  isPrivate: z.boolean().optional(),
});

// The owner can promote/demote. "OWNER" isn't allowed here: there's exactly one owner.
export const setRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], { error: "Role must be ADMIN or MEMBER" }),
});
