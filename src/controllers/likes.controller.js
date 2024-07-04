import { Like } from "../models/like.model.js";
import { Song } from "../models/song.model.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSongLike = asyncHandler(async (req, res) => {
  const { songId } = req.params;

  if (!songId) {
    throw new APIError(400, "Song ID is required");
  }

  const like = await Like.findOneAndDelete({
    song: songId,
    likedBy: req.user._id,
  });

  let updateQuery;
  if (like) {
    // If like exists, decrement likesCount
    updateQuery = { $inc: { likesCount: -1 } };
  } else {
    // If like does not exist, increment likesCount
    updateQuery = { $inc: { likesCount: 1 } };
    // Add a new like
    await Like.create({ song: songId, likedBy: req.user._id });
  }

  const song = await Song.findByIdAndUpdate(songId, updateQuery, { new: true });

  if (!song) {
    throw new APIError(500, "Failed to update song likes count");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { likesCount: song.likesCount },
        "Like toggled successfully"
      )
    );
});

const getLikedSong = asyncHandler(async (req, res) => {
  const allLikes = await Like.find({
    likedBy: req.user._id,
    song: { $exists: true },
  }).populate("song"); // Populate the 'song' field to get the associated songs
  if (!allLikes) {
    return new APIError(501, "Error while fetching the slike song");
  }
  const likedSongs = allLikes.map((like) => like.song); // Extract the songs from the likes
  return res
    .status(200)
    .json(new APIResponse(200, likedSongs, "Liked songs fetched successfully"));
});

export { toggleSongLike, getLikedSong };
