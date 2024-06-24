import { Router } from "express";
import {
  getUserPlaylists,
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:userId").get(verifyJWT, getUserPlaylists);

router.route("/create").post(verifyJWT, createPlaylist);

router.route("/user/:playlistId").get(verifyJWT, getPlaylistById);

router.route("/add/:playlistId/:songId").post(verifyJWT, addSongToPlaylist);

router
  .route("/remove/:playlistId/:songId")
  .delete(verifyJWT, removeSongFromPlaylist);

router.route("/update/:playlistId").patch(verifyJWT, updatePlaylist);

router.route("/delete/:playlistId").delete(verifyJWT, deletePlaylist);

export default router;
