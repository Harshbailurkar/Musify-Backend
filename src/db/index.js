import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("Connected to database!");
    console.log("Host: " + mongoose.connection.host);
  } catch (error) {
    console.error("Connection error : " + error);
    process.exit(1);
  }
};

export default connectDB;
