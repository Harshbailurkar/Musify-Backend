import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/apiError.js";
import {
  uploadOnCloudinary,
  deleteImagefromCloudinary,
} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponce.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    console.log(err);
    throw new APIError(
      500,
      "something went rong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
  const { username, email, password, fullName } = req.body;

  if (!username && !email && !password && !fullName) {
    throw new APIError("Please provide all fields", 400);
  }
  const userexits = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });
  if (userexits) {
    throw new APIError("User already exists", 400);
  }
  let avatarLocalPath = req.files?.avatar;
  if (req.files?.avatar !== undefined) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  }
  let avatar = null;
  if (typeof avatarLocalPath === "string" && avatarLocalPath.trim() !== "") {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }

  const user = await User.create({
    username: username,
    email: email,
    fullName: fullName,
    password: password,
    avatar: avatar?.url,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError("Failed to create user", 500);
  }

  return res.status(201).json(new APIResponse(201, createdUser));
});
const loginUser = asyncHandler(async (req, res, next) => {
  //req-body = data
  //username or email, password
  //find the user
  //validate the user
  //acess and refresh token creation
  //send cokkies
  //send res
  const { usernameOremail, password } = req.body;
  console.log(usernameOremail);
  if (!usernameOremail) {
    throw new APIError("Username or Email is Required", 400);
  }
  const user = await User.findOne({
    $or: [{ username: usernameOremail }, { email: usernameOremail }],
  });
  console.log("Login user : " + user);
  if (!user) {
    throw new APIError("user not found", 404);
  }
  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    throw new APIError("Incorrect Password", 401);
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // to get user becoz upper user has emplty refresh token and has field of password.
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .lean();

  const options = {
    //becoz of these cookies only modified by server only.
    httpOnly: true,
    //secure: true,
    sameSite: "None",
  };
  // req.user = user;    check this when frontend is completed
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          //data
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // remove foeld from ducument
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, null, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new APIError(301, "unathorised Request! login again");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new APIError(301, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new APIError(301, "Refresh token is expired or used!! login again");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APIResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "AcessToken Refreshed"
        )
      );
  } catch (error) {
    console.log(error);
    throw new APIError(301, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;
  console.log("change password " + oldPassword, newPassword, confPassword);
  if (!oldPassword || !newPassword || !confPassword) {
    throw new APIError(400, {}, "All Fields are required");
  }
  if (newPassword !== confPassword) {
    throw new APIError(400, "cant match password");
  }

  const userId = req.user?._id;
  const user = await User.findById(userId);

  const isPasswordCorrect = await user.matchPassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new APIError(400, "Invalid Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "password Change Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  console.log("GetUser " + req.user);
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new APIError(400, "All Fileds are reqired");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new APIResponse(200, user, "account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  const oldAvatarToBeDelete = req.user?.avatar;
  if (!oldAvatarToBeDelete) {
    throw new APIError(400, "error while getting the avatar image");
  }
  const deleteAvatar = await deleteImagefromCloudinary(oldAvatarToBeDelete);
  if (!deleteAvatar) {
    throw new APIError(400, " error while deleting the old Avatar");
  }

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new APIError(400, "avatar file not found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new APIError(400, "Error while updating avatar ");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new APIResponse(200, user, "Avatar Updated Successfuly"));
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  console.log(username);
  if (!username?.trim()) {
    throw new APIError(400, "username is missing");
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
  console.log(channel);

  if (!channel?.length) {
    throw new APIError(404, "Channel does not exits");
  }
  return res
    .status(200)
    .json(new APIResponse(200, channel[0], "user channel fetch successfully"));
});
{
  // const getLikedSongs = asyncHandler(async (req, res) => {
  //   const user = await User.aggregate([
  //     {
  //       $match: {
  //         _id: new mongoose.Types.ObjectId(req.user_id),
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "songs",
  //         localField: "likedSongs",
  //         foreignField: "_id",
  //         as: "likedSongs",
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: "users",
  //               localField: "artist",
  //               foreignField: "_id",
  //               as: "artist",
  //               pipeline: [
  //                 {
  //                   $project: {
  //                     fullName: 1,
  //                     avatar: 1,
  //                   },
  //                 },
  //               ],
  //             },
  //           },
  //           {
  //             $addFields: {
  //               artist: {
  //                 $first: "$artist",
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   ]);
  //   return res
  //     .status(200)
  //     .json(new APIResponse(200, user, "liked songs fetched successfully"));
  // });
}
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getUserProfile,
  //  getLikedSongs,
};
