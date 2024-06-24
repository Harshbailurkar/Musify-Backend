import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleSongLike,
  getLikedSong,
} from "../controllers/likes.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getLikedSong);

router.route("/toggle-like/:songId").post(verifyJWT, toggleSongLike);

export default router;
