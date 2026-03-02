import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `users/${req.user._id}/profile`,
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "fill", quality: "auto" }
    ]
  })
});


const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `users/${req.user._id}/gallery`,
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 900, crop: "limit", quality: "auto" }
    ]
  })
});

export const uploadProfile =
  multer({ storage: profileStorage });

export const uploadGallery =
  multer({ storage: galleryStorage });