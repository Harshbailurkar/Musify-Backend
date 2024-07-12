import mongoose, { Schema } from "mongoose";

const listenlaterSchema = new Schema(
  {
    song: [
      {
        type: Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    listenLaterBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
export const ListenLater = mongoose.model("ListenLater", listenlaterSchema);
