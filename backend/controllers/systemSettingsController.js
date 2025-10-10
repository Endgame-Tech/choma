// backend/controllers/systemSettingsController.js
const SystemSettings = require("../models/SystemSettings");

// @desc    Get all system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find().sort({ category: 1, settingKey: 1 });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Get settings by category
// @route   GET /api/admin/settings/category/:category
// @access  Private/Admin
exports.getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const settings = await SystemSettings.find({ category }).sort({ settingKey: 1 });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching settings by category:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Get single setting by key
// @route   GET /api/admin/settings/:settingKey
// @access  Private/Admin
exports.getSettingByKey = async (req, res) => {
  try {
    const { settingKey } = req.params;

    const setting = await SystemSettings.findOne({ settingKey });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: "Setting not found"
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error("Error fetching setting:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Update setting value
// @route   PUT /api/admin/settings/:settingKey
// @access  Private/Admin
exports.updateSetting = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { settingValue } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    if (settingValue === undefined || settingValue === null) {
      return res.status(400).json({
        success: false,
        error: "settingValue is required"
      });
    }

    const setting = await SystemSettings.findOne({ settingKey });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: "Setting not found"
      });
    }

    if (!setting.isEditable) {
      return res.status(403).json({
        success: false,
        error: "This setting is not editable"
      });
    }

    // Validate value type
    if (setting.settingType === 'number' && isNaN(Number(settingValue))) {
      return res.status(400).json({
        success: false,
        error: "Setting value must be a number"
      });
    }

    if (setting.settingType === 'boolean' && typeof settingValue !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "Setting value must be a boolean"
      });
    }

    // Additional validation for specific settings
    if (settingKey === 'CUSTOM_PLAN_FEE_PERCENT') {
      const numValue = Number(settingValue);
      if (numValue < 0 || numValue > 100) {
        return res.status(400).json({
          success: false,
          error: "Customization fee percent must be between 0 and 100"
        });
      }
    }

    if (settingKey === 'CUSTOM_PLAN_MIN_WEEKS' || settingKey === 'CUSTOM_PLAN_MAX_WEEKS') {
      const numValue = Number(settingValue);
      if (numValue < 1 || numValue > 12) {
        return res.status(400).json({
          success: false,
          error: "Duration must be between 1 and 12 weeks"
        });
      }
    }

    // Update setting
    setting.settingValue = settingValue;
    setting.updatedBy = adminId;
    await setting.save();

    res.json({
      success: true,
      message: "Setting updated successfully",
      data: setting
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Get setting value (for client apps)
// @route   GET /api/settings/value/:settingKey
// @access  Public
exports.getSettingValue = async (req, res) => {
  try {
    const { settingKey } = req.params;

    const value = await SystemSettings.getSetting(settingKey);

    if (value === null) {
      return res.status(404).json({
        success: false,
        error: "Setting not found"
      });
    }

    res.json({
      success: true,
      data: {
        settingKey,
        value
      }
    });
  } catch (error) {
    console.error("Error fetching setting value:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Initialize default settings (one-time setup)
// @route   POST /api/admin/settings/initialize
// @access  Private/Admin
exports.initializeSettings = async (req, res) => {
  try {
    await SystemSettings.initializeDefaults();

    res.json({
      success: true,
      message: "System settings initialized successfully"
    });
  } catch (error) {
    console.error("Error initializing settings:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};
