import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowedAccounts,
  createViewerToken,
  getMostFollowedChannels,
  updateUserCoverPhoto,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
//Public Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

//secured Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/change-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/changecoverphoto")
  .patch(verifyJWT, upload.single("coverPhoto"), updateUserCoverPhoto);
//channel routes
router.route("/c/:username").get(verifyJWT, getUserProfile);
router.post("/follow/:channelId", verifyJWT, followUser);
router.post("/unfollow/:channelId", verifyJWT, unfollowUser);
router.get("/followed-channels", verifyJWT, getFollowedAccounts);
router.get("/most-followed-channels", verifyJWT, getMostFollowedChannels);

//stream routes
router.route("/createvtoken/:hostId").post(verifyJWT, createViewerToken);

export default router;
