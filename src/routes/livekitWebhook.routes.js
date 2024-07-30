import { Router } from "express";
import { handleLivekitWebhook } from "../controllers/livekitWebHook.controller.js";

const router = Router();

router.route("/livekit").post(handleLivekitWebhook);

export default router;
