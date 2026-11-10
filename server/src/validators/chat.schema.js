import { z } from "zod";

export const startConversationSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Username is required"),
});

// Used by BOTH the REST route and the Socket.io "message:send" event, so the rules are identical.
export const messageSchema = z.object({
  text: z.string().trim().min(1, "Message can't be empty").max(2000, "Messages can be at most 2000 characters"),
});
