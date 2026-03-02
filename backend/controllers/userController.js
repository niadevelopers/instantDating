import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";


export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const searchUsers = async (req, res) => {
  try {
    const { minAge, maxAge, location, intentions, page = 1 } = req.query;

    const limit = 8; // 8 users per page requested
    const skip = (parseInt(page) - 1) * limit;

    let query = {
      "banned.status": false,
      role: "user",
    };

    if (location) query.location = location;
    if (intentions) query.intentions = intentions;

    if (minAge || maxAge) {
      query.age = {};
      if (minAge) query.age.$gte = Number(minAge);
      if (maxAge) query.age.$lte = Number(maxAge);
    }

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
      totalResults: totalUsers
    });
    
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getUserProfile = async (req, res) => {
  try {
    const profile = await User.findById(req.params.id).select("-password");

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user._id.toString() !== profile._id.toString()) {
      profile.stats.visitors = (profile.stats.visitors || 0) + 1;
      await profile.save();
    }

    res.json(profile);
  } catch (err) {
    console.error("getUserProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const registerContactClick = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.stats.clicksToday = (user.stats.clicksToday || 0) + 1;
    user.stats.clicksWeek = (user.stats.clicksWeek || 0) + 1;
    user.stats.clicksMonth = (user.stats.clicksMonth || 0) + 1;

    await user.save();

    res.json({ message: "Click recorded" });
  } catch (err) {
    console.error("registerContactClick error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const COOLDOWN_DAYS = 3;
    const now = new Date();

    if (user.lastProfileImageUpdated) {
      const timeDiffMs = now - user.lastProfileImageUpdated;
      const daysSince = timeDiffMs / (1000 * 60 * 60 * 24);

      if (daysSince < COOLDOWN_DAYS) {
        const remaining = Math.ceil(COOLDOWN_DAYS - daysSince);
        return res.status(429).json({
          message: `You can only change your profile picture once every ${COOLDOWN_DAYS} days. Try again in ${remaining} day${remaining > 1 ? "s" : ""}.`,
        });
      }
    }

    if (user.profileImage) {
      try {
        const publicId = extractPublicId(user.profileImage);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (err) {
        console.warn("Failed to delete old Cloudinary profile image:", err);
      }
    }

    user.profileImage = req.file.path; 
    user.lastProfileImageUpdated = now;
    await user.save();

    res.json({
      image: user.profileImage,
      message: "Profile image updated successfully",
    });
  } catch (err) {
    console.error("uploadProfileImage error:", err);
    res.status(500).json({ message: "Server error during profile image upload" });
  }
};


export const uploadGalleryImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentCount = user.gallery?.length || 0;
    const newCount = req.files.length;
    const total = currentCount + newCount;
    const MAX_GALLERY = 3;

    if (total > MAX_GALLERY) {
      return res.status(400).json({
        message: `Gallery limit is ${MAX_GALLERY} images. You currently have ${currentCount}. You can upload up to ${MAX_GALLERY - currentCount} more.`,
      });
    }

    const urls = req.files.map((file) => file.path); 

    user.gallery.push(...urls);
    await user.save();

    res.status(200).json({
      images: urls,
      currentGalleryCount: user.gallery.length,
      message: `Successfully added ${urls.length} image${urls.length === 1 ? "" : "s"}`,
    });
  } catch (err) {
    console.error("uploadGalleryImage error:", err);
    res.status(500).json({ message: "Server error during gallery upload" });
  }
};


export const deleteGalleryImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      const publicId = extractPublicId(imageUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn("Cloudinary delete failed:", err);
    }

    user.gallery = user.gallery.filter((img) => img !== imageUrl);
    await user.save();

    res.json({
      gallery: user.gallery,
      message: "Image removed successfully",
    });
  } catch (err) {
    console.error("deleteGalleryImage error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const unlockWhatsapp = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID required" });
    }

    const target = await User.findById(targetUserId).select("whatsapp");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ whatsapp: target.whatsapp });
  } catch (err) {
    console.error("unlockWhatsapp error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


function extractPublicId(url) {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.split(".")[0];

    const folderIndex = parts.findIndex((p) => p.includes("users"));
    if (folderIndex !== -1) {
      const folderPath = parts.slice(folderIndex, -1).join("/");
      return `${folderPath}/${filename}`;
    }

    return filename;
  } catch {
    return null;
  }
}