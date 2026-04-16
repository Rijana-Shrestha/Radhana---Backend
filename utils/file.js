import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_FOLDER = "radhanaArt";

async function uploadFile(files) {
  // Return empty array if no files
  if (!files || files.length === 0) {
    return [];
  }

  const results = [];

  for (const file of files) {
    try {
      // Validate file buffer exists
      if (!file.buffer) {
        throw new Error(`File buffer is undefined for file: ${file.originalname || "unknown"}`);
      }

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: CLOUDINARY_FOLDER,
            resource_type: "auto"
          },
          (error, data) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return reject(error);
            }
            resolve(data);
          }
        );

        // Handle stream errors
        uploadStream.on('error', (err) => {
          console.error("Upload stream error:", err);
          reject(err);
        });

        uploadStream.end(file.buffer);
      });

      results.push(result);
    } catch (uploadError) {
      console.error("Error uploading file:", uploadError.message || uploadError);
      throw {
        statusCode: 400,
        message: `File upload failed: ${uploadError.message || "Unknown error"}`
      };
    }
  }

  return results;
}

export default uploadFile;
