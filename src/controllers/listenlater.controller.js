import { ListenLater } from "../models/listenlater.model.js";
import { Song } from "../models/song.model.js";

import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addSongToListenLater = asyncHandler(async (req, res) => {
  const { songId } = req.params;

  if (!songId) {
    throw new APIError(400, "Song ID is required");
  }

  const listenLaterExist = await ListenLater.findOne({
    song: songId,
    listenLaterBy: req.user._id,
  });
  if (listenLaterExist) {
    throw new APIError(400, "Song already exists in listen later");
  }

  const listenLater = await ListenLater.create({
    song: songId,
    listenLaterBy: req.user._id,
  });

  if (!listenLater) {
    throw new APIError(500, "Failed to add song to listen later");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        listenLater,
        "Song added to listen later successfully"
      )
    );
});

const removeSongToListenLater = asyncHandler(async (req, res) => {
  const { songId } = req.params;

  if (!songId) {
    throw new APIError(400, "Song ID is required");
  }

  const listenLater = await ListenLater.findOneAndDelete({
    song: songId,
    listenLaterBy: req.user._id,
  });

  if (!listenLater) {
    throw new APIError(404, "Song not found in listen later");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        listenLater,
        "Song removed from listen later successfully"
      )
    );
});

const getListenLaterSongs = asyncHandler(async (req, res) => {
  const allListenLater = await ListenLater.find({
    listenLaterBy: req.user._id,
    song: { $exists: true },
  }).populate("song");

  const listenLaterSongs = allListenLater.map(
    (listenLater) => listenLater.song
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        listenLaterSongs,
        "Listen later songs fetched successfully"
      )
    );
});

export { addSongToListenLater, removeSongToListenLater, getListenLaterSongs };
