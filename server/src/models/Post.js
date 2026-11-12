import mongoose from "mongoose";

// authorId and groupId are UUIDs from PostgreSQL (User.id / Group.id).
const postSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    groupId: { type: String, default: null },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    images: [{ type: String }],
    // Photo descriptions for screen readers ("alt text"), in the same order as `images`; "" = none.
    imageDescriptions: [{ type: String, trim: true, maxlength: 200 }],
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    editedAt: { type: Date, default: null }, // set when the author changes the text
  },
  { timestamps: true }
);

// Makes the home feed query fast: "posts by these authors, newest first".
postSchema.index({ authorId: 1, createdAt: -1, _id: -1 });
postSchema.index({ groupId: 1, createdAt: -1, _id: -1 }); // a group's posts, newest first
// For explore (everyone's posts, newest first).
postSchema.index({ createdAt: -1, _id: -1 });
// For search: a "text index" splits every post into words (and word stems, so "walks" finds
// "walking"), skips common words like "the", and lets MongoDB rank posts by how well they match.
// A collection can have only ONE text index.
postSchema.index({ content: "text" });

export const Post = mongoose.model("Post", postSchema);
