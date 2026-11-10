import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: String, required: true }], // Postgres user IDs
    // "idA:idB" with the two ids sorted. The unique index guarantees there is only ONE
    // conversation between two people, even if both click "Message" at the same moment.
    key: { type: String, required: true, unique: true },
    lastMessage: {
      text: String,
      senderId: String,
      at: Date,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
