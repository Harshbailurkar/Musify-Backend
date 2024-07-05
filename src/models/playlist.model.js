import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
