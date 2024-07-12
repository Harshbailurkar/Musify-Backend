import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    song: [
      {
        type: Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
export const Like = mongoose.model("Like", likeSchema);
