import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
const PORT = process.env.PORT || 8000;

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error : " + error);
      throw error;
    });

    app.listen(PORT, () => {
      console.log("Server started at port " + PORT);
    });
  })
  .catch((error) => {
    console.log("Connection error : " + error);
  });
