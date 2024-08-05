import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import status from "express-status-monitor";
import bodyParser from "body-parser";
import userRouter from "./routes/user.routes.js";
import songRouter from "./routes/song.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import listenLaterRouter from "./routes/listenlater.routes.js";
import streamRouter from "./routes/stream.routes.js";
import webhookRouter from "./routes/livekitWebhook.routes.js";
import stripeRouter from "./routes/stripe.routes.js";
import stripeWebhookRouter from "./routes/stripeWebhook.routes.js";
import paidStreamsRouter from "./routes/paidStreams.routes.js";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use("/api/v1/webhooks/stripe", stripeWebhookRouter);
app.use(express.json({ limit: "50kb" }));
app.use(status());
app.use(bodyParser.raw({ type: "application/webhook+json" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/songs", songRouter);
app.use("/api/v1/likedsongs", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/listenlater", listenLaterRouter);
app.use("/api/v1/streams", streamRouter);
app.use("/api/v1/webhooks", webhookRouter);
app.use("/api/v1/concert", stripeRouter);
app.use("/api/v1/p", paidStreamsRouter);

export { app };
