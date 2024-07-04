import mongoose from "mongoose";
const { Schema } = mongoose;

const FollowingSchema = new Schema(
  {
    followers: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Following = mongoose.model("Following", FollowingSchema);

export default Following;
