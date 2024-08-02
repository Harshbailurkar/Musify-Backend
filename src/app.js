import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import status from "express-status-monitor";
import bodyParser from "body-parser";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(status());
app.use(bodyParser.raw({ type: "application/webhook+json" }));

//routes import
import userRouter from "./routes/user.routes.js";
import songRouter from "./routes/song.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import listenLaterRouter from "./routes/listenlater.routes.js";
import streamRouter from "./routes/stream.routes.js";
import webhookRouter from "./routes/livekitWebhook.routes.js";

//Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/songs", songRouter);
app.use("/api/v1/likedsongs", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/listenlater", listenLaterRouter);
app.use("/api/v1/streams", streamRouter);
app.use("/api/v1/webhooks", webhookRouter);
// http://localhost:8000/api/v1/users/register
export { app };
