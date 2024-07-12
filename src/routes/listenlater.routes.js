import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addSongToListenLater,
  removeSongToListenLater,
  getListenLaterSongs,
} from "../controllers/listenlater.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getListenLaterSongs);

router.route("/add/:songId").post(verifyJWT, addSongToListenLater);

router.route("/remove/:songId").delete(verifyJWT, removeSongToListenLater);

export default router;
