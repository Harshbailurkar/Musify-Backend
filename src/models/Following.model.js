import mongoose, { Schema } from "mongoose";

const FollowingSchema = new Schema(
  {
    followers: {
      type: Schema.types.ObjectId,
      ref: "User",
    },
    following: {
      type: Schema.types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Following = mongoose.model("Following", FollowingSchema);
