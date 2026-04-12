import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_FOLDER = "radhanaArt";

async function uploadFile(files) {
  const results = [];

  for (const file of files) {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: CLOUDINARY_FOLDER }, (error, data) => {
          if (error) return reject(error);
          resolve(data);
        })
        .end(file.buffer);
    });
    results.push(result);
  }

  return results;
}

export default uploadFile;
