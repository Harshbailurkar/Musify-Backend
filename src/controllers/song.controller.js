import { asyncHandler } from "../utils/asyncHandler.js";
import { Song } from "../models/song.model.js";
import { APIError } from "../utils/apiError.js";
import {
  uploadOnCloudinary,
  deleteImagefromCloudinary,
} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponce.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";

const getAllSongs = asyncHandler(async (req, res) => {
  const { pageNo } = req.params;
  const page = parseInt(pageNo) || 1; // Default to page 1 if pageNo is not provided
  const limit = 24;
  const startIndex = (page - 1) * limit;

  // Fetch paginated results directly from the database using skip, limit, and sort
  const songs = await Song.find()
    .sort({ likesCount: -1 }) // Sort by likesCount in descending order
    .skip(startIndex)
    .limit(limit);
  const songCount = await Song.countDocuments(); // Get the total number of songs

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        songs,
        songCount,
        `Songs on page ${page} fetched successfully`
      )
    );
});

const publishASong = asyncHandler(async (req, res) => {
  const { title, album, language, artist } = req.body;
  const owner = req.user?.username;
  if (!title && !album && !req.files?.length && !language) {
    throw new APIError("please provide all the fields", 400);
  }
  let { genre } = req.body;
  if (typeof genre === "string") {
    genre = JSON.parse(genre);
  }
  if (req.files?.songUrl === undefined) {
    throw new APIError("Song is Required", 400);
  }
  const songLocalPath = req.files?.songUrl[0]?.path;

  let thumbnailLocalPath = req.files?.thumbnailUrl;
  if (thumbnailLocalPath !== undefined) {
    thumbnailLocalPath = req.files?.thumbnailUrl[0]?.path;
  }
  if (!songLocalPath) {
    throw new APIError("Song Required", 404);
  }
  const song = await uploadOnCloudinary(songLocalPath);

  if (!song) {
    throw new APIError("Error in uploading song", 500);
  }

  let thumbnail = null;
  if (
    typeof thumbnailLocalPath === "string" &&
    thumbnailLocalPath.trim() !== ""
  ) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  }
  const duration = song?.duration;
  const thumbnailURL = thumbnail?.secure_url;

  const newSong = await Song.create({
    title,
    album,
    owner,
    artist,
    songUrl: song.url,
    ThumbnailUrl: thumbnailURL,
    duration: duration,
    genre,
    language,
  });
  const uploadedSong = await Song.findById(newSong._id);
  if (!uploadedSong) {
    throw new APIError("Failed to upload song", 500);
  }

  return res
    .status(201)
    .json(new APIResponse(201, newSong, "Song added successfully"));
});

const getSongById = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const MAX_RECENT_SONGS = 10;
  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized request");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new APIError(404, "User not found");
  }
  user.recentlyPlayed = user.recentlyPlayed.filter(
    (entry) => entry.songId.toString() !== songId
  );
  user.recentlyPlayed.unshift({ songId, playedAt: new Date() });

  if (user.recentlyPlayed.length > MAX_RECENT_SONGS) {
    user.recentlyPlayed = user.recentlyPlayed.slice(0, MAX_RECENT_SONGS);
  }

  await user.save();

  if (!songId?.trim()) {
    throw new APIError(400, "songId is missing");
  }
  const song = await Song.findById(songId);
  if (!song) {
    throw new APIError(404, "Song Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, song, "songs with name fetch successfully"));
});

const getRecentPlayedSongs = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new APIError(401, "Unauthorized request");
  }
  const user = await User.findById(userId).populate("recentlyPlayed.songId");

  if (!user) {
    throw new APIError(404, "User not found");
  }

  // only send 5 songs
  const MAX_RECENT_SONGS = 5;

  const recentSongs = user.recentlyPlayed
    .slice(0, MAX_RECENT_SONGS)
    .sort((a, b) => b.playedAt - a.playedAt)
    .map((entry) => entry.songId);

  if (!recentSongs.length) {
    throw new APIError(404, "No recently played songs found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        recentSongs,
        "Recently played songs fetched successfully"
      )
    );
});

const getSongsByName = asyncHandler(async (req, res) => {
  const { songname } = req.params;
  if (!songname?.trim()) {
    throw new APIError(400, "songname is missing");
  }
  const song = await Song.find({ title: new RegExp(songname, "i") });
  if (!song?.length) {
    throw new APIError(404, "Song Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, song, "songs with name fetch successfully"));
});

const updateSong = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { title, album } = req.body;

  if (!songId?.trim()) {
    throw new APIError(400, "songId is missing");
  }

  const song = await Song.findById(songId);

  if (!song) {
    throw new APIError(404, "Song Not Found");
  }

  let ThumbnailUrl = song.ThumbnailUrl;

  if (req.file) {
    if (ThumbnailUrl) {
      const oldThumbnail = ThumbnailUrl;
      await deleteImagefromCloudinary(oldThumbnail);
    }

    const thumbnailLocalPath = req.file.path;
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new APIError(500, "Error in uploading thumbnail");
    }
    ThumbnailUrl = thumbnail.url;
  }

  const updatedSong = await Song.findByIdAndUpdate(
    songId,
    { title, album, ThumbnailUrl },
    { new: true }
  );

  if (!updatedSong) {
    throw new APIError(500, "Failed to update song");
  }

  return res
    .status(200)
    .json(new APIResponse(200, updatedSong, "Song updated successfully"));
});

const deleteSong = asyncHandler(async (req, res) => {
  const { songId } = req.params;

  if (!songId?.trim()) {
    throw new APIError(400, "songId is missing");
  }

  const song = await Song.findById(songId);
  if (!song) {
    throw new APIError(404, "Song Not Found");
  }
  if (song.owner !== req.user.username) {
    throw new APIError(
      402,
      "Unauthorized request! you dont have permission to perform this action !"
    );
  }
  if (song.owner === req.user.username) {
    if (song.songUrl) {
      await deleteImagefromCloudinary(song.songUrl);
    }
    if (song.ThumbnailUrl) {
      await deleteImagefromCloudinary(song.ThumbnailUrl);
    }

    const deletedSong = await Song.findByIdAndDelete(songId);
    await Like.deleteMany({ song: songId });
    if (!deletedSong) {
      throw new APIError(500, "Failed to delete song");
    }
  }

  return res
    .status(200)
    .json(new APIResponse(200, deletedSong, "Song deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { SongId } = req.params;

  if (!SongId?.trim()) {
    throw new APIError(400, "SongId is missing");
  }

  const song = await Song.findById(SongId);
  if (!song) {
    throw new APIError(404, "Song not found");
  }

  song.published = !song.published;
  const status = song.published ? "public" : "private";
  const updatedSong = await song.save();
  if (!updatedSong) {
    throw new APIError(500, "Failed to toggle publish status");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        updatedSong,
        `Publish status change to ${status} successfully`
      )
    );
});

const getSongByGenre = asyncHandler(async (req, res) => {
  const { genre } = req.params;
  if (!genre?.trim()) {
    throw new APIError(400, "Genre is missing");
  }
  const songs = await Song.find({ genre: { $in: genre } });
  if (!songs?.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, songs, "Songs with genre fetch successfully"));
});
const getSongByLanguage = asyncHandler(async (req, res) => {
  const { language } = req.params;
  if (!language?.trim()) {
    throw new APIError(400, "Language is missing");
  }
  const songs = await Song.find({ language: language });
  if (!songs?.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(
      new APIResponse(200, songs, "Songs with language fetch successfully")
    );
});
const getSongByAlbum = asyncHandler(async (req, res) => {
  const { album } = req.params;
  if (!album?.trim()) {
    throw new APIError(400, "Album is missing");
  }
  const songs = await Song.find({ album: album });
  if (!songs?.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, songs, "Songs with album fetch successfully"));
});
const getSongByArtist = asyncHandler(async (req, res) => {
  const { artist } = req.params;
  if (!artist?.trim()) {
    throw new APIError(400, "Artist is missing");
  }
  const songs = await Song.find({ artist: artist });
  if (!songs?.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, songs, "Songs with artist fetch successfully"));
});
const getSongByOwner = asyncHandler(async (req, res) => {
  const { owner } = req.params;
  if (!owner?.trim()) {
    throw new APIError(400, "Owner is missing");
  }
  const songs = await Song.find({ owner: owner });
  if (!songs?.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(new APIResponse(200, songs, "Songs with owner fetch successfully"));
});
const getSongByMostLiked = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page);
  const limit = 30;
  const songs = await Song.find()
    .sort({ likesCount: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (!songs.length) {
    throw new APIError(404, "Songs Not Found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, songs, "Songs with most likes fetched successfully")
    );
});
const searchSongs = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json(new APIResponse(400, [], "Query parameter is required", false));
  }

  let searchCriteria = {
    $or: [
      { title: { $regex: query, $options: "i" } },
      { artist: { $regex: query, $options: "i" } },
      { owner: { $regex: query, $options: "i" } },
      { album: { $regex: query, $options: "i" } },
      { genre: { $regex: query, $options: "i" } },
      { language: { $regex: query, $options: "i" } },
    ],
  };

  const resultSongs = await Song.find(searchCriteria).limit(100);

  const channels = await User.aggregate([
    {
      $match: {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "followings",
        localField: "_id",
        foreignField: "following",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "followings",
        localField: "_id",
        foreignField: "followers",
        as: "following",
      },
    },
    {
      $addFields: {
        followerCount: { $size: "$followers" },
        followingCount: { $size: "$following" },
        isfollowed: {
          $cond: {
            if: { $in: [req.user?._id, "$followers.followers"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        avatar: 1,
        username: 1,
        followerCount: 1,
        followingCount: 1,
        isfollowed: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { songs: resultSongs, channels },
        "Songs and artist profiles fetched successfully",
        true
      )
    );
});

const HomeSongs = asyncHandler(async (req, res) => {
  const songs = await Song.find()
    .sort({ likesCount: -1, createdAt: -1 })
    .limit(5);

  if (!songs.length) {
    throw new APIError(404, "Songs Not Found");
  }
  return res
    .status(200)
    .json(
      new APIResponse(200, songs, "Recently added songs fetched successfully")
    );
});

export {
  getAllSongs,
  publishASong,
  getSongById,
  getSongsByName,
  updateSong,
  deleteSong,
  togglePublishStatus,
  getSongByGenre,
  getSongByLanguage,
  getSongByAlbum,
  getSongByArtist,
  getSongByOwner,
  getSongByMostLiked,
  searchSongs,
  HomeSongs,
  getRecentPlayedSongs,
};
