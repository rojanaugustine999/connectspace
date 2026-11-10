import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // who receives it
    type: { type: String, enum: ["follow", "like", "comment", "message"], required: true },
    actorId: { type: String, required: true }, // who did the action
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
