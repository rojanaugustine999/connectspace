import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

export const createPostSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(2000, "Posts can be at most 2000 characters"),
  // Image URLs for now; real uploads come in Week 7.
  images: z.array(z.string().trim().url("Each image must be a valid URL")).max(4, "At most 4 images").optional(),
});

// Editing changes the text only; photos stay as they were posted.
export const updatePostSchema = z.object({
  content: createPostSchema.shape.content,
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Write a comment first").max(1000, "Comments can be at most 1000 characters"),
  parentId: objectId.optional(), // set when replying to another comment
});
