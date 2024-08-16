import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/apiError.js";
import {
  uploadOnCloudinary,
  deleteImagefromCloudinary,
} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponce.js";
import jwt from "jsonwebtoken";
import Following from "../models/Following.model.js";
import { AccessToken } from "livekit-server-sdk";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, "User not found");
    }

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    console.error("Error generating tokens:", err);
    throw new APIError(500, "Failed to generate tokens");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password || !fullName) {
    throw new APIError(402, "Please provide all fields");
  }

  const userExists = await User.findOne({ $or: [{ username }, { email }] });
  if (userExists) {
    throw new APIError(400, "User already exists");
  }

  let avatar = null;
  if (req.files?.avatar) {
    const avatarLocalPath = req.files.avatar[0].path;
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }

  const newUser = await User.create({
    username,
    email,
    fullName,
    password,
    avatar: avatar?.url,
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new APIError(500, "Failed to create user");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    createdUser._id
  );
  const tokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, tokenOptions)
    .cookie("refreshToken", refreshToken, tokenOptions)
    .cookie("userId", createdUser._id, tokenOptions)
    .json(new APIResponse(201, createdUser));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { usernameOremail, password } = req.body;
  const user = await User.findOne({
    $or: [{ username: usernameOremail }, { email: usernameOremail }],
  });
  if (!user) {
    throw new APIError(404, "User not found");
  }

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new APIError(400, "Incorrect Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .lean();

  const tokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, tokenOptions)
    .cookie("refreshToken", refreshToken, tokenOptions)
    .cookie("userId", user._id, tokenOptions)
    .json(
      new APIResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );
  if (!user) {
    throw new APIError(500, "Failed to log out user");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new APIResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new APIError(401, "Unauthorized request! Login again");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);

    if (!user || incomingRefreshToken !== user.refreshToken) {
      throw new APIError(401, "Invalid refresh token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const tokenOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, tokenOptions)
      .cookie("refreshToken", newRefreshToken, tokenOptions)
      .json(
        new APIResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    throw new APIError(401, error.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new APIError(400, "All fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new APIError(400, "Passwords do not match");
  }

  const userId = req.user?._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new APIError(404, "User not found");
  }

  const isPasswordCorrect = await user.matchPassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new APIError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new APIError(400, "Either fullName or email is required");
  }

  const updateFields = {};
  if (fullName) {
    updateFields.fullName = fullName;
  }
  if (email) {
    updateFields.email = email;
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { new: true }
  ).select("-password -refreshToken -accessToken");

  // Handle user update response

  if (!user) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(new APIResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  if (req.user?.avatar) {
    const oldAvatar = req.user?.avatar;
    if (!oldAvatar) {
      throw new APIError(400, "Error while getting the avatar image");
    }

    const deleteAvatar = await deleteImagefromCloudinary(oldAvatar);
    if (!deleteAvatar) {
      throw new APIError(400, "Error while deleting the old avatar");
    }
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file not found");
  }

  const newAvatar = await uploadOnCloudinary(avatarLocalPath);
  if (!newAvatar.url) {
    throw new APIError(400, "Error while updating avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: newAvatar.url } },
    { new: true }
  );
  if (!user) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(new APIResponse(200, user, "Avatar updated successfully"));
});
const updateUserCoverPhoto = asyncHandler(async (req, res, next) => {
  if (req.user?.coverPhoto) {
    const oldCoverPhoto = req.user?.coverPhoto;
    if (!oldCoverPhoto) {
      throw new APIError(400, "Error while getting the cover photo");
    }
    const deleteCoverPhoto = await deleteImagefromCloudinary(oldCoverPhoto);
    if (!deleteCoverPhoto) {
      throw new APIError(400, "Error while deleting the old cover photo");
    }
  }
  const coverPhotoLocalPath = req.file?.path;
  if (!coverPhotoLocalPath) {
    throw new APIError(400, "Cover photo file not found");
  }
  const newCoverPhoto = await uploadOnCloudinary(coverPhotoLocalPath);
  if (!newCoverPhoto.url) {
    throw new APIError(400, "Error while updating cover photo");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverPhoto: newCoverPhoto.url } },
    { new: true }
  );
  if (!user) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(new APIResponse(200, user, "Cover photo updated successfully"));
});

const followUser = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const followerId = req.user._id;

  try {
    const existingFollow = await Following.findOne({
      followers: followerId,
      following: channelId,
    });
    if (existingFollow) {
      throw new APIError(400, "User is already following this channel/user");
    }

    const follow = new Following({
      followers: followerId,
      following: channelId,
    });
    await follow.save();
    return res
      .status(200)
      .json(new APIResponse(200, {}, "User followed successfully"));
  } catch (error) {
    console.error("Error following user:", error.message);
    throw new APIError(
      error.status || 500,
      error.message || "Failed to follow user"
    );
  }
});

const unfollowUser = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const followerId = req.user._id;

  try {
    const result = await Following.deleteOne({
      followers: followerId,
      following: channelId,
    });
    if (!result.deletedCount) {
      throw new APIError(400, "User is not following this channel/user");
    }
    return res
      .status(200)
      .json(new APIResponse(200, {}, "User unfollowed successfully"));
  } catch (error) {
    console.error("Error unfollowing user:", error.message);
    throw new APIError(
      error.status || 500,
      error.message || "Failed to unfollow user"
    );
  }
});
const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new APIError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
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
        followerCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
        isFollowed: {
          $in: [req.user?._id, "$followers.followers"],
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
        isFollowed: 1,
        coverPhoto: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new APIError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, channel[0], "User channel fetched successfully")
    );
});
const getFollowedAccounts = async (req, res) => {
  try {
    const userId = req.user._id;
    const followedAccounts = await Following.find({
      followers: userId,
    }).populate("following");

    const followedUsers = followedAccounts.map((account) => account.following);

    res.json({ followedUsers });
  } catch (error) {
    console.error("Error fetching followed accounts:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching followed accounts" });
  }
};
export const getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (err) {
    console.error(err);
  }
};
export const createViewerToken = async (req, res) => {
  try {
    const hostId = req.params.hostId.toString();
    const userId = req.user._id.toString();

    if (userId) {
      const host = await getUserById(hostId);
      if (!host) {
        throw new Error("host not found");
      }

      const isHost = hostId === userId;
      const viewerToken = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
          identity: isHost ? `host-${hostId}` : userId,
          name: req.user.username,
        }
      );

      viewerToken.addGrant({
        room: hostId,
        roomJoin: true,
        canPublish: false,
        canPublishData: true,
      });
      const codedToken = await viewerToken.toJwt();
      return res.status(200).json({ token: codedToken });
    } else {
      throw new Error("login required");
    }
  } catch (err) {
    console.error(err);
  }
};
const getMostFollowedChannels = asyncHandler(async (req, res) => {
  try {
    const channels = await Following.aggregate([
      {
        $group: {
          _id: "$following",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "channel",
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 6,
      },
      {
        $project: {
          _id: 0,
          channelId: "$_id",
          channelUsername: { $arrayElemAt: ["$channel.username", 0] },
          channelName: { $arrayElemAt: ["$channel.fullName", 0] },
          channelAvatar: { $arrayElemAt: ["$channel.avatar", 0] },
          followerCount: "$count",
        },
      },
    ]);

    return res
      .status(200)
      .json(new APIResponse(200, channels, "Most followed channels fetched"));
  } catch (error) {
    console.error("Error fetching most followed channels:", error);
    throw new APIError(
      error.status || 500,
      error.message || "Failed to get most followed channels"
    );
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  followUser,
  unfollowUser,
  getUserProfile,
  getFollowedAccounts,
  getMostFollowedChannels,
  updateUserCoverPhoto,
};
