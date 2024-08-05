import { Router } from "express";
import { stripecheckout } from "../controllers/stripe.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/checkout").post(verifyJWT, stripecheckout);

export default router;
