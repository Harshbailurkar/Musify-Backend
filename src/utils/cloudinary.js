import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("Could not find a file");
    } else {
      // Upload file to Cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
      });
      // File uploaded successfully
      fs.unlinkSync(localFilePath); // Remove the locally saved temp file
      return response;
    }
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temp file as the upload failed
    return null;
  }
};

const deleteImagefromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) {
      throw new Error("Cloudinary image URL not provided");
    } else {
      const response = await cloudinary.uploader.destroy(imageUrl, {
        invalidate: true,
      });
      return response;
    }
  } catch (error) {
    throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
  }
};

export { uploadOnCloudinary, deleteImagefromCloudinary };
