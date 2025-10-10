// backend/routes/systemSettingsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  updateSetting,
  getSettingValue,
  initializeSettings
} = require("../controllers/systemSettingsController");

// Admin routes (protected)
router.get("/", getAllSettings);
router.get("/category/:category", getSettingsByCategory);
router.get("/:settingKey", getSettingByKey);
router.put("/:settingKey", updateSetting);
router.post("/initialize", initializeSettings);

module.exports = router;
