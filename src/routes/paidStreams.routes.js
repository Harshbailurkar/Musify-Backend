import { getUserPaidStreams } from "../controllers/stream.controller.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/paidstreams").get(verifyJWT, getUserPaidStreams);
export default router;
