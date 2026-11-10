import { z } from "zod";

// Only these fields can be changed through PATCH /api/users/me.
// z.object() drops any other keys, so a request like { "email": "...", "password": "..." }
// can't sneak changes in ("mass assignment" protection).
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name is too long").optional(),
  bio: z.string().trim().max(160, "Bio can be at most 160 characters").optional(),
  avatarUrl: z
    .union([z.literal(""), z.string().trim().url("Enter a valid image URL (https://...)")])
    .optional(),
});
