import express from "express";
import auth from "../middleware/authMiddleware.js";
import tierLimiter from "../middleware/tierLimiter.js";
import paymentVerify from "../middleware/paymentVerify.js";

import {
  uploadProfile,
  uploadGallery
} from "../middleware/uploadMiddleware.js";

import {
  getMyProfile,
  updateProfile,
  searchUsers,
  getUserProfile,
  registerContactClick,
  uploadProfileImage,
  uploadGalleryImage,
  deleteGalleryImage, 
  unlockWhatsapp    
} from "../controllers/userController.js";

const router = express.Router();


router.get("/me", auth, getMyProfile);
router.put("/update", auth, updateProfile);
router.get("/search", auth, searchUsers);
router.get("/:id", auth, getUserProfile);


router.post(
  "/upload/profile",
  auth,
  uploadProfile.single("image"),
  uploadProfileImage
);

router.post(
  "/upload/gallery",
  auth,
  uploadGallery.array("image", 3),
  uploadGalleryImage
);

router.delete("/gallery", auth, deleteGalleryImage);


router.post(
  "/contact-click", 
  auth, 
  tierLimiter, 
  registerContactClick
);

router.post(
  "/unlock-contact",
  auth,
  paymentVerify,
  tierLimiter,
  unlockWhatsapp
);

export default router;