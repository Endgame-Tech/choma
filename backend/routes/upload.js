const express = require("express");
const router = express.Router();
const { cloudinary, upload, uploadToFolder } = require("../config/cloudinary");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/auth");

// Upload logo endpoint (admin only)
router.post(
  "/logo",
  adminAuth.authenticateAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No logo file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const logoUrl = req.file.path;

      console.log("✅ Logo uploaded successfully to:", logoUrl);

      res.json({
        success: true,
        message: "Logo uploaded successfully",
        logoUrl: logoUrl,
        publicId: req.file.filename,
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload logo",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Get current logo URL
router.get("/logo", (req, res) => {
  const logoUrl =
    process.env.CHOMA_LOGO_URL ||
    "https://via.placeholder.com/200x100/F7AE1A/FFFFFF?text=CHOMA";

  res.json({
    success: true,
    logoUrl: logoUrl,
  });
});

// Upload profile image during signup (no auth required)
router.post(
  "/signup-profile-image",
  uploadToFolder("profiles").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Signup profile image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Profile image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Signup profile image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload profile image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload profile image endpoint (authenticated users)
router.post(
  "/profile-image",
  auth,
  uploadToFolder("profiles").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Profile image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Profile image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload profile image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload banner image endpoint (admin only)
router.post(
  "/banner-image",
  adminAuth.authenticateAdmin,
  uploadToFolder("banners").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No banner image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Banner image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Banner image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Banner image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload banner image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload meal image endpoint (admin only)
router.post(
  "/meal-image",
  adminAuth.authenticateAdmin,
  uploadToFolder("meals").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No meal image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Meal image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Meal image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Meal image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload meal image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload meal plan cover image endpoint (admin only)
router.post(
  "/meal-plan-image",
  adminAuth.authenticateAdmin,
  uploadToFolder("meal-plans").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No meal plan image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Meal plan image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Meal plan image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Meal plan image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload meal plan image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload tag image endpoint (admin only)
router.post(
  "/tag-image",
  adminAuth.authenticateAdmin,
  uploadToFolder("tags").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No tag image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Tag image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Tag image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Tag image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload tag image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Upload tag preview image endpoint (admin only)
router.post(
  "/tag-preview",
  adminAuth.authenticateAdmin,
  uploadToFolder("tag-previews").single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No tag preview image file provided",
        });
      }

      // The file is already uploaded to Cloudinary by multer
      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Tag preview image uploaded successfully to:", imageUrl);

      res.json({
        success: true,
        message: "Tag preview image uploaded successfully",
        imageUrl: imageUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("Tag preview image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload tag preview image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
