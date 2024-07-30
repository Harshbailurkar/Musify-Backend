import { Router } from "express";
import { createIngress } from "../controllers/ingress.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createStream,
  getLiveStreams,
} from "../controllers/stream.controller.js";
const router = Router();

router.route("/Ingress").post(verifyJWT, createIngress);
router
  .route("/createstream")
  .post(verifyJWT, upload.single("thumbnail"), createStream);
router.route("/live").get(verifyJWT, getLiveStreams);

export default router;
