import { Router } from "express";
import {
  getAllSongs,
  publishASong,
  getSongsByName,
  getSongById,
  updateSong,
  deleteSong,
  togglePublishStatus,
  getSongByGenre,
  getSongByLanguage,
  getSongByAlbum,
  getSongByArtist,
  getSongByOwner,
  getSongByMostLiked,
  searchSongs,
  HomeSongs,
  getRecentPlayedSongs,
} from "../controllers/song.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

router.route("/search").get(verifyJWT, searchSongs);

router.route("/type/:genre").get(verifyJWT, getSongByGenre);

router.route("/popular/:page").get(verifyJWT, getSongByMostLiked);

router.route("/language/:language").get(verifyJWT, getSongByLanguage);

router.route("/album/:album").get(verifyJWT, getSongByAlbum);

router.route("/artist/:artist").get(verifyJWT, getSongByArtist);

router.route("/owner/:owner").get(verifyJWT, getSongByOwner);

router.route("/song-home").get(verifyJWT, HomeSongs);

router.route("/recently-played").get(verifyJWT, getRecentPlayedSongs);

router.route("/:pageNo").get(verifyJWT, getAllSongs);

router.route("/add-song").post(
  verifyJWT,
  upload.fields([
    {
      name: "songUrl",
      maxCount: 1,
    },
    {
      name: "thumbnailUrl",
      maxCount: 1,
    },
  ]),
  publishASong
);

router.route("/songid/:songId").get(verifyJWT, getSongById);

router.route("/s/:songname").get(verifyJWT, getSongsByName);

router
  .route("/update-song/:songId")
  .patch(verifyJWT, upload.single("thumbnailUrl"), updateSong);

router.route("/delete/songid/:songId").delete(verifyJWT, deleteSong);

router.route("/PublishStatus/:SongId").patch(verifyJWT, togglePublishStatus);

export default router;
