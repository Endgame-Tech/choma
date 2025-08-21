const express = require("express");
const router = express.Router();
const PromoBanner = require("../models/PromoBanner");
const { authenticateAdmin } = require("../middleware/adminAuth");
const rateLimit = require("express-rate-limit");

// Rate limiting for banner operations
// Rate limiting for banner operations
const bannerRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { success: false, message: "Too many banner requests" },
});

// GET /api/banners/active - Get active banners for mobile app
router.get("/active", bannerRateLimit, async (req, res) => {
  try {
    const { targetAudience = "all" } = req.query;

    const banners = await PromoBanner.getActiveBanners(targetAudience);

    // Track impressions for active banners
    const bannerIds = banners.map((b) => b._id);
    if (bannerIds.length > 0) {
      await PromoBanner.updateMany(
        { _id: { $in: bannerIds } },
        { $inc: { impressions: 1 } }
      );
    }

    res.json({
      success: true,
      data: banners,
      count: banners.length,
    });
  } catch (err) {
    console.error("Get active banners error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// POST /api/banners/:id/click - Track banner click
router.post("/:id/click", bannerRateLimit, async (req, res) => {
  try {
    const banner = await PromoBanner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    await banner.trackClick();

    res.json({
      success: true,
      message: "Click tracked successfully",
    });
  } catch (err) {
    console.error("Track banner click error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to track click",
    });
  }
});

// Admin routes (require authentication)

// GET /api/banners - Get all banners (admin)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, targetAudience } = req.query;

    const query = {};
    if (status) query.isActive = status === "active";
    if (targetAudience && targetAudience !== "all") {
      query.targetAudience = targetAudience;
    }

    const banners = await PromoBanner.find(query)
      .populate("createdBy", "username email")
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PromoBanner.countDocuments(query);

    res.json({
      success: true,
      data: banners,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Get banners error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// GET /api/banners/:id - Get single banner (admin)
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const banner = await PromoBanner.findById(req.params.id).populate(
      "createdBy",
      "username email"
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.json({
      success: true,
      data: banner,
    });
  } catch (err) {
    console.error("Get banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banner",
    });
  }
});

// POST /api/banners - Create new banner (admin)
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Banner creation route hit");
    console.log("🔍 Request headers:", {
      authorization: req.headers.authorization ? "Present" : "Missing",
      contentType: req.headers["content-type"],
    });
    console.log("🔍 Admin auth check:", {
      adminExists: !!req.admin,
      adminId: req.admin?.adminId,
      adminEmail: req.admin?.email,
    });

    const {
      title,
      subtitle,
      imageUrl,
      ctaText,
      ctaDestination,
      ctaParams,
      externalUrl,
      isActive = true,
      priority = 0,
      startDate,
      endDate,
      targetAudience = "all",
    } = req.body;

    // Validation
    if (!title || !imageUrl || !ctaText || !ctaDestination) {
      return res.status(400).json({
        success: false,
        message: "Title, image URL, CTA text, and CTA destination are required",
      });
    }

    if (ctaDestination === "External" && !externalUrl) {
      return res.status(400).json({
        success: false,
        message: "External URL is required when CTA destination is External",
      });
    }

    // Ensure admin is authenticated
    if (!req.admin || !req.admin.adminId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const banner = new PromoBanner({
      title,
      subtitle,
      imageUrl,
      ctaText,
      ctaDestination,
      ctaParams,
      externalUrl,
      isActive,
      priority,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      targetAudience,
      createdBy: req.admin.adminId,
    });

    await banner.save();

    const populatedBanner = await PromoBanner.findById(banner._id).populate(
      "createdBy",
      "username email"
    );

    res.status(201).json({
      success: true,
      data: populatedBanner,
      message: "Banner created successfully",
    });
  } catch (err) {
    console.error("Create banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create banner",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// PUT /api/banners/:id - Update banner (admin)
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      subtitle,
      imageUrl,
      ctaText,
      ctaDestination,
      ctaParams,
      externalUrl,
      isActive,
      priority,
      startDate,
      endDate,
      targetAudience,
    } = req.body;

    const banner = await PromoBanner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Validation for external URLs
    if (ctaDestination === "External" && !externalUrl) {
      return res.status(400).json({
        success: false,
        message: "External URL is required when CTA destination is External",
      });
    }

    // Update fields
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (imageUrl !== undefined) banner.imageUrl = imageUrl;
    if (ctaText !== undefined) banner.ctaText = ctaText;
    if (ctaDestination !== undefined) banner.ctaDestination = ctaDestination;
    if (ctaParams !== undefined) banner.ctaParams = ctaParams;
    if (externalUrl !== undefined) banner.externalUrl = externalUrl;
    if (isActive !== undefined) banner.isActive = isActive;
    if (priority !== undefined) banner.priority = priority;
    if (startDate !== undefined)
      banner.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined)
      banner.endDate = endDate ? new Date(endDate) : null;
    if (targetAudience !== undefined) banner.targetAudience = targetAudience;

    await banner.save();

    const populatedBanner = await PromoBanner.findById(banner._id).populate(
      "createdBy",
      "username email"
    );

    res.json({
      success: true,
      data: populatedBanner,
      message: "Banner updated successfully",
    });
  } catch (err) {
    console.error("Update banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update banner",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// DELETE /api/banners/:id - Delete banner (admin)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const banner = await PromoBanner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (err) {
    console.error("Delete banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
    });
  }
});

// GET /api/banners/:id/stats - Get banner analytics (admin)
router.get("/:id/stats", authenticateAdmin, async (req, res) => {
  try {
    const banner = await PromoBanner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    const stats = {
      impressions: banner.impressions,
      clicks: banner.clicks,
      ctr: banner.ctr,
      isCurrentlyActive: banner.isCurrentlyActive(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("Get banner stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banner stats",
    });
  }
});

module.exports = router;
