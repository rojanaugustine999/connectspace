import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // for replies
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
