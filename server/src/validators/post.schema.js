import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

export const createPostSchema = z
  .object({
    content: z.string().trim().min(1, "Write something first").max(2000, "Posts can be at most 2000 characters"),
    // URLs from POST /api/uploads/image
    images: z.array(z.string().trim().url("Each image must be a valid URL")).max(4, "At most 4 images").optional(),
    // One optional description per photo, in the same order (for screen readers)
    imageDescriptions: z
      .array(z.string().trim().max(200, "Photo descriptions can be at most 200 characters"))
      .max(4, "At most 4 images")
      .optional(),
  })
  .refine((d) => (d.imageDescriptions?.length ?? 0) <= (d.images?.length ?? 0), {
    path: ["imageDescriptions"],
    message: "There are more descriptions than photos",
  });

// Editing changes the text only; photos stay as they were posted.
export const updatePostSchema = z.object({
  content: createPostSchema.shape.content,
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Write a comment first").max(1000, "Comments can be at most 1000 characters"),
  parentId: objectId.optional(), // set when replying to another comment
});
