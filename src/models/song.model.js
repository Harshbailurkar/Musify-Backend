import mongoose, { Schema } from "mongoose";
import mongooseAggegatePaginate from "mongoose-aggregate-paginate-v2";
const songSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    owner: {
      type: String,
    },
    artist: {
      type: String,
      trim: true,
      index: true,
    },
    album: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    ThumbnailUrl: {
      type: String,
      trim: true,
    },
    songUrl: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    published: {
      type: Boolean,
      default: true,
    },
    genre: {
      type: [String],
      default: ["random"],
    },
    language: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Schema.Types.ObjectId,
      ref: "Like",
    },
  },
  { timestamps: true }
);

songSchema.plugin(mongooseAggegatePaginate);

songSchema.pre("remove", async function (next) {
  try {
    await Like.deleteMany({ song: this._id });
    next();
  } catch (error) {
    next(error);
  }
});
export const Song = mongoose.model("Song", songSchema);
