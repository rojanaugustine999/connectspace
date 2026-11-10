import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

// A user can like a post only once.
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);
