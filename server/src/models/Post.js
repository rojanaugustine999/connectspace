import mongoose from "mongoose";

// authorId and groupId are UUIDs from PostgreSQL (User.id / Group.id).
const postSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    groupId: { type: String, default: null },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    images: [{ type: String }],
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Makes the home feed query fast: "posts by these authors, newest first".
postSchema.index({ authorId: 1, createdAt: -1, _id: -1 });
postSchema.index({ groupId: 1, createdAt: -1 });
// For explore (everyone's posts, newest first).
postSchema.index({ createdAt: -1, _id: -1 });

export const Post = mongoose.model("Post", postSchema);
