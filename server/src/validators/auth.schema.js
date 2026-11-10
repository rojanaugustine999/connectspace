// Zod schemas describe what a valid request body looks like.
// Never trust data from the browser: always validate on the server, even if the form validates too.
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name is too long"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: letters, numbers or _"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  // bcrypt only uses the first 72 bytes of a password, so cap it there.
  password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
