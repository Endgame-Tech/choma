const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "your-cloud-name",
  api_key: process.env.CLOUDINARY_API_KEY || "your-api-key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "your-api-secret",
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "choma",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

// Helper function to upload image with custom folder and optimized transformations
const uploadToFolder = (folder) => {
  // Define optimized transformations based on image type
  const getTransformations = (folder) => {
    switch (folder) {
      case "meals":
        return [
          {
            width: 800,
            height: 600,
            crop: "fill",
            gravity: "center",
            quality: "auto:good",
          },
          { fetch_format: "auto", flags: "progressive" },
        ];
      case "meal-plans":
        return [
          {
            width: 1080,
            height: 1350,
            crop: "limit", // Use "limit" to preserve aspect ratio, not "fill"
            gravity: "center",
            quality: "auto:good",
          },
          { fetch_format: "auto", flags: "progressive" },
        ];
      case "banners":
        return [
          {
            width: 1200,
            height: 400,
            crop: "fill",
            gravity: "center",
            quality: "auto:good",
          },
          { fetch_format: "auto", flags: "progressive" },
        ];
      case "profiles":
        return [
          {
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
          },
          { fetch_format: "auto", flags: "progressive" },
        ];
      default:
        return [
          { width: 1200, height: 800, crop: "limit", quality: "auto:good" },
          { fetch_format: "auto", flags: "progressive" },
        ];
    }
  };

  return multer({
    storage: new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `choma/${folder}`,
        allowedFormats: ["jpg", "jpeg", "png", "webp"],
        transformation: getTransformations(folder),
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed!"), false);
      }
    },
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadToFolder,
  deleteImage,
};
