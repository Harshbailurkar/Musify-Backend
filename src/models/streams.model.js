import mongoose from "mongoose";

const streamSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    ticketPrice: {
      type: Number,
    },
    ingressId: {
      type: String,
      unique: true,
    },
    serverUrl: {
      type: String,
    },
    streamKey: {
      type: String,
      unique: true,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isChatEnabled: {
      type: Boolean,
      default: false,
    },
    isChatDelayed: {
      type: Boolean,
      default: false,
    },
    isChatFollowersOnly: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Streams = mongoose.model("Streams", streamSchema);
