import { Router } from "express";
import { createIngress } from "../controllers/ingress.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createStream,
  getLiveStreams,
  getStreamById,
  getUserPaidStreams,
  getUserStream,
  stopStream,
} from "../controllers/stream.controller.js";
const router = Router();
import { verifyPayment } from "../middlewares/payment.middleware.js";

router.route("/Ingress").post(verifyJWT, createIngress);
router
  .route("/createstream")
  .post(verifyJWT, upload.single("thumbnail"), createStream);
router.route("/live").get(verifyJWT, getLiveStreams);
router.route("/user/:userId").get(verifyJWT, getUserStream);
router.route("/:id").get(verifyJWT, verifyPayment, getStreamById);
router.route("/paidstreams").get(verifyJWT, getUserPaidStreams);
router.route("/stopstream/:id").post(verifyJWT, stopStream);

export default router;
