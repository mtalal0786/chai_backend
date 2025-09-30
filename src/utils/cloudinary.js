import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log("Environment Variables in cloudinary.js:", {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME

});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath || !fs.existsSync(localFilePath)) {
            throw new Error("File does not exist or path is invalid");
        }

        // Upload file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // File has been uploaded successfully
        console.log("File uploaded successfully on Cloudinary", response.url);

        // Optional: Remove local file asynchronously
        fs.unlink(localFilePath, (err) => {
            if (err) {
                console.error("Error deleting local file:", err);
            }
        });

        return { success: true, url: response.url };

    } catch (error) {
        // Error occurred during file upload or processing
        fs.unlink(localFilePath, (err) => {
            if (err) {
                console.error("Error deleting local file:", err);
            }
        });

        console.error("Error uploading file on Cloudinary", error);
        return { success: false, message: error.message };
    }
};

export { uploadOnCloudinary };
