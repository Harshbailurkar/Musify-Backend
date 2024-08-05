import { User } from "../models/user.model.js";
import { Streams } from "../models/streams.model.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponce.js";
import {
  uploadOnCloudinary,
  deleteImagefromCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";
export const createStream = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, description, entryFee } = req.body;
    const thumbnailLocalPath = req.file ? req.file.path : null;
    if (!userId) {
      throw new APIError(401, "login required");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new APIError(404, "user not found");
    }
    const existingStream = await Streams.findOne({ userId });
    if (existingStream) {
      const oldThumbnail = existingStream.thumbnail;
      if (oldThumbnail) {
        const deleteAvatar = await deleteImagefromCloudinary(oldThumbnail);
        if (!deleteAvatar) {
          throw new APIError(400, "Error while deleting the old Thumbnail");
        }
      }
    }

    let thumbnail = null;
    if (
      typeof thumbnailLocalPath === "string" &&
      thumbnailLocalPath.trim() !== ""
    ) {
      thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }
    const thumbnailURL = thumbnail?.secure_url;
    const updateFields = {
      title,
      description,
    };
    if (thumbnailURL) {
      updateFields.thumbnail = thumbnailURL;
    }
    if (entryFee) {
      updateFields.ticketPrice = entryFee;
    }

    const stream = await Streams.findOneAndUpdate(
      { userId: userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );
    return res
      .status(200)
      .json(new APIResponse(200, stream, "stream generated sucessfully"));
  } catch (error) {
    throw new APIError("network or server not responding");
  }
};
export const getLiveStreams = async (req, res) => {
  try {
    const getAllLiveUsers = await Streams.find({ isLive: true })
      .select("-serverUrl -streamKey -ingressId")
      .populate("userId", "username avatar");

    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          getAllLiveUsers,
          "all live stream fetched sucessfully "
        )
      );
  } catch (error) {
    throw new APIError("network or server not responding");
  }
};
export const getStreamById = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      throw new APIError(401, "login required");
    }
    const stream = await Streams.findOne({ userId })
      .select("-serverUrl -streamKey -ingressId")
      .populate("userId", "username avatar");
    if (!stream) {
      throw new APIError(404, "stream not found");
    }
    return res
      .status(200)
      .json(new APIResponse(200, stream, "stream fetched sucessfully"));
  } catch (error) {
    throw new APIError("network or server not responding");
  }
};
export const getUserPaidStreams = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getUserStream = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new APIError(401, "login required");
  }
  const stream = await Streams.findOne({ userId }).select(
    "-serverUrl -streamKey -ingressId"
  );
  return res
    .status(200)
    .json(new APIResponse(200, stream, "stream fetched sucessfully"));
};
export const stopStream = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      throw new APIError(404, "stream Not Found");
    }
    const streamerObjectId = new mongoose.Types.ObjectId(userId);
    await User.updateMany(
      {},
      {
        $pull: {
          payments: { userId: streamerObjectId },
        },
      }
    );
    return res
      .status(200)
      .json(new APIResponse(200, "stream stopped sucessfully"));
  } catch (error) {
    throw new APIError("network or server not responding");
  }
};
