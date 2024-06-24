import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Song } from "../models/song.model.js";
const createPlaylist = asyncHandler(async (req, res) => {
  const { name } = req.body;
  console.log("Request body:", req.body); // Debugging log

  if (!name || name.trim() === "") {
    throw new APIError(400, "Name is required");
  }

  const playlistExist = await Playlist.findOne({ name });
  if (playlistExist) {
    throw new APIError(400, "Playlist already exists");
  }

  const playList = new Playlist({
    name,
    owner: req.user._id,
  });

  await playList.save();
  console.log("Created playlist:", playList); // Debugging log

  if (!playList) {
    throw new APIError(500, "There was a problem while creating the playlist");
  }

  return res
    .status(200)
    .json(new APIResponse(200, playList, "Playlist was created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new APIError(400, "Id is required");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "songs",
        localField: "song",
        foreignField: "_id",
        as: "song",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        owner: {
          $arrayElemAt: ["$owner", 0], // Extract the first element of the owner array
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new APIResponse(200, playlist, "Playlists returned successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // Validate the playlist ID
  if (!playlistId) {
    throw new APIError(400, "Playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new APIError(400, "Playlist Id is invalid");
  }

  try {
    // Aggregate pipeline to fetch playlist by ID and include songs and owner details
    const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $lookup: {
          from: "songs", // Ensure this matches your collection name
          localField: "songs",
          foreignField: "_id",
          as: "songs",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      },
    ]);

    // Check if the playlist was found
    if (!playlist || playlist.length === 0) {
      throw new APIError(404, "Playlist not found");
    }

    // Return the found playlist
    return res
      .status(200)
      .json(
        new APIResponse(200, playlist[0], "Playlist is returned successfully")
      );
  } catch (error) {
    console.error("Error fetching playlist:", error);
    throw new APIError(500, "Internal Server Error");
  }
});

const addSongToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, songId } = req.params;

  if (!playlistId || !songId) {
    throw new APIError(400, "Playlist Id and Song Id are required");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new APIError(404, "Playlist not found");
  }

  const songExist = playlist.songs.find((item) => item.toString() === songId);
  if (songExist) {
    throw new APIError(400, "Song already exists in the playlist");
  }

  const song = await Song.findById(songId);
  if (!song) {
    throw new APIError(404, "Song not found");
  }

  playlist.songs.push(song._id);
  const updatedPlayList = await playlist.save();

  // Check if the playlist update was successful
  if (!updatedPlayList) {
    throw new APIError(500, "There was a problem while updating the playlist");
  }

  // Return the updated playlist
  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        updatedPlayList,
        "Song was added to the playlist successfully"
      )
    );
});

const removeSongFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, songId } = req.params;

  if (!playlistId || !songId) {
    throw new APIError(400, "Playlist Id and Song Id are required");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new APIError(404, "Playlist not found");
  }

  playlist.songs = playlist.songs.filter((item) => !item.equals(songId));
  const updatedPlayList = await playlist.save();

  if (!updatedPlayList) {
    throw new APIError(500, "There was a problem while updating the playlist");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        updatedPlayList,
        "Song was deleted from the playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new APIError(400, "Playlist id is required");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
  if (!deletedPlaylist) {
    throw new APIError(500, "There was a problem while deleting the playlist");
  }
  return res.status(200).json(new APIResponse(200, {}, "Playlist was removed"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name } = req.body;
  console.log(playlistId);
  console.log(name);
  if (!playlistId) {
    throw new APIError(400, "Playlist id is required");
  }
  if (name.trim() === "") {
    throw new APIError(400, "Name is required");
  }
  const updatedPlayList = await Playlist.findByIdAndUpdate(playlistId, {
    name,
  });
  if (!updatedPlayList) {
    throw new APIError(500, "There was a problem while updating the Playlist");
  }
  return res
    .status(200)
    .json(
      new APIResponse(200, updatePlaylist, "Playlist was updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
