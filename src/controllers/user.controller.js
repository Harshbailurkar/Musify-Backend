import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/apiError.js";
import {
  uploadOnCloudinary,
  deleteImagefromCloudinary,
} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponce.js"; // Corrected import
import jwt from "jsonwebtoken";
import Following from "../models/Following.model.js";

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
    throw new APIError(400, "Please provide all fields");
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

  return res.status(201).json(new APIResponse(201, createdUser));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { usernameOremail, password } = req.body;
  console.log(usernameOremail, password);
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
    sameSite: "None",
    path: "/",
    domain:"https://musifyharshbailurkar.netlify.app"
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, tokenOptions)
    .cookie("refreshToken", refreshToken, tokenOptions)
    .cookie("username", user.username, tokenOptions)
    .cookie("userId", user._id.toString(), tokenOptions)
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
   
    sameSite: "None",
    path: "/",
    domain:"https://musifyharshbailurkar.netlify.app"
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("username", cookieOptions)
    .clearCookie("userId", cookieOptions)
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
      sameSite: "Lax",
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
    console.log(`User ${followerId} is now following user ${channelId}`);
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

    console.log(`User ${followerId} unfollowed user ${channelId}`);
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
    const userId = req.user._id; // Assuming the user ID is available in req.user

    // Find the documents where the user is following others
    const followedAccounts = await Following.find({
      followers: userId,
    }).populate("following");

    // Extract the followed user information
    const followedUsers = followedAccounts.map((account) => account.following);

    res.json({ followedUsers });
  } catch (error) {
    console.error("Error fetching followed accounts:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching followed accounts" });
  }
};
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
};
