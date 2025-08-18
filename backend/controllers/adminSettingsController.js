const mongoose = require('mongoose');

// Create a Settings model for system configuration
const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

// ============= SYSTEM SETTINGS MANAGEMENT =============

// Default system settings
const defaultSettings = [
  // App Configuration
  {
    key: 'app.name',
    value: 'choma',
    type: 'string',
    category: 'app',
    description: 'Application name',
    isPublic: true
  },
  {
    key: 'app.version',
    value: '1.0.0',
    type: 'string',
    category: 'app',
    description: 'Application version',
    isPublic: true
  },
  {
    key: 'app.maintenance_mode',
    value: false,
    type: 'boolean',
    category: 'app',
    description: 'Enable maintenance mode',
    isPublic: true
  },
  {
    key: 'app.maintenance_message',
    value: 'We are currently performing maintenance. Please check back soon.',
    type: 'string',
    category: 'app',
    description: 'Maintenance mode message',
    isPublic: true
  },
  
  // Payment Settings
  {
    key: 'payment.currency',
    value: 'NGN',
    type: 'string',
    category: 'payment',
    description: 'Default currency',
    isPublic: true
  },
  {
    key: 'payment.tax_rate',
    value: 7.5,
    type: 'number',
    category: 'payment',
    description: 'Tax rate percentage',
    isPublic: false
  },
  {
    key: 'payment.delivery_fee',
    value: 500,
    type: 'number',
    category: 'payment',
    description: 'Default delivery fee',
    isPublic: true
  },
  {
    key: 'payment.free_delivery_threshold',
    value: 5000,
    type: 'number',
    category: 'payment',
    description: 'Minimum order amount for free delivery',
    isPublic: true
  },
  
  // Order Settings
  {
    key: 'order.auto_cancel_timeout',
    value: 30,
    type: 'number',
    category: 'order',
    description: 'Auto cancel unpaid orders after X minutes',
    isPublic: false
  },
  {
    key: 'order.max_daily_orders',
    value: 100,
    type: 'number',
    category: 'order',
    description: 'Maximum orders per day',
    isPublic: false
  },
  {
    key: 'order.preparation_time',
    value: 45,
    type: 'number',
    category: 'order',
    description: 'Average preparation time in minutes',
    isPublic: true
  },
  
  // Notification Settings
  {
    key: 'notification.email_enabled',
    value: true,
    type: 'boolean',
    category: 'notification',
    description: 'Enable email notifications',
    isPublic: false
  },
  {
    key: 'notification.sms_enabled',
    value: false,
    type: 'boolean',
    category: 'notification',
    description: 'Enable SMS notifications',
    isPublic: false
  },
  {
    key: 'notification.push_enabled',
    value: true,
    type: 'boolean',
    category: 'notification',
    description: 'Enable push notifications',
    isPublic: false
  },
  
  // Security Settings
  {
    key: 'security.max_login_attempts',
    value: 5,
    type: 'number',
    category: 'security',
    description: 'Maximum login attempts before lockout',
    isPublic: false
  },
  {
    key: 'security.lockout_duration',
    value: 30,
    type: 'number',
    category: 'security',
    description: 'Account lockout duration in minutes',
    isPublic: false
  },
  {
    key: 'security.session_timeout',
    value: 480,
    type: 'number',
    category: 'security',
    description: 'Session timeout in minutes',
    isPublic: false
  },
  
  // Business Settings
  {
    key: 'business.operating_hours',
    value: {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '22:00', closed: false },
      saturday: { open: '10:00', close: '20:00', closed: false },
      sunday: { open: '10:00', close: '18:00', closed: false }
    },
    type: 'object',
    category: 'business',
    description: 'Operating hours for each day',
    isPublic: true
  },
  {
    key: 'business.contact_email',
    value: 'support@choma.com',
    type: 'string',
    category: 'business',
    description: 'Customer support email',
    isPublic: true
  },
  {
    key: 'business.contact_phone',
    value: '+234-800-MEAL-MATE',
    type: 'string',
    category: 'business',
    description: 'Customer support phone',
    isPublic: true
  }
];

// Initialize default settings
exports.initializeSettings = async () => {
  try {
    for (const setting of defaultSettings) {
      const exists = await Settings.findOne({ key: setting.key });
      if (!exists) {
        await Settings.create(setting);
      }
    }
    console.log('✅ Default settings initialized');
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

// Get all settings
exports.getAllSettings = async (req, res) => {
  try {
    const { category, publicOnly } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (publicOnly === 'true') query.isPublic = true;

    const settings = await Settings.find(query)
      .populate('updatedBy', 'firstName lastName email')
      .sort({ category: 1, key: 1 });

    // Group settings by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        settings: grouped,
        total: settings.length
      }
    });
  } catch (err) {
    console.error('Get all settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single setting
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ key })
      .populate('updatedBy', 'firstName lastName email');

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (err) {
    console.error('Get setting error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    // Validate value type
    const isValidType = validateValueType(value, setting.type);
    if (!isValidType) {
      return res.status(400).json({
        success: false,
        message: `Invalid value type. Expected ${setting.type}`
      });
    }

    // Update setting
    const updatedSetting = await Settings.findOneAndUpdate(
      { key },
      {
        value,
        updatedBy: req.admin.adminId,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('updatedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updatedSetting
    });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Bulk update settings
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Settings array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const { key, value } of settings) {
      try {
        const setting = await Settings.findOne({ key });
        if (!setting) {
          errors.push({ key, error: 'Setting not found' });
          continue;
        }

        // Validate value type
        const isValidType = validateValueType(value, setting.type);
        if (!isValidType) {
          errors.push({ key, error: `Invalid value type. Expected ${setting.type}` });
          continue;
        }

        // Update setting
        const updatedSetting = await Settings.findOneAndUpdate(
          { key },
          {
            value,
            updatedBy: req.admin.adminId,
            updatedAt: new Date()
          },
          { new: true }
        );

        results.push({ key, success: true, value: updatedSetting.value });
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.length} settings updated successfully`,
      data: {
        updated: results,
        errors
      }
    });
  } catch (err) {
    console.error('Bulk update settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update settings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Create new setting
exports.createSetting = async (req, res) => {
  try {
    const { key, value, type, category, description, isPublic = false } = req.body;

    if (!key || value === undefined || !type || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Key, value, type, category, and description are required'
      });
    }

    // Check if setting already exists
    const existingSetting = await Settings.findOne({ key });
    if (existingSetting) {
      return res.status(409).json({
        success: false,
        message: 'Setting with this key already exists'
      });
    }

    // Validate value type
    const isValidType = validateValueType(value, type);
    if (!isValidType) {
      return res.status(400).json({
        success: false,
        message: `Invalid value type. Expected ${type}`
      });
    }

    // Create setting
    const setting = new Settings({
      key,
      value,
      type,
      category,
      description,
      isPublic,
      updatedBy: req.admin.adminId
    });

    await setting.save();

    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: setting
    });
  } catch (err) {
    console.error('Create setting error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create setting',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete setting
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    // Prevent deletion of critical settings
    const criticalSettings = [
      'app.name',
      'payment.currency',
      'security.max_login_attempts'
    ];

    if (criticalSettings.includes(key)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete critical system setting'
      });
    }

    await Settings.findOneAndDelete({ key });

    res.json({
      success: true,
      message: 'Setting deleted successfully',
      data: { deletedKey: key }
    });
  } catch (err) {
    console.error('Delete setting error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete setting',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Reset settings to default
exports.resetSettings = async (req, res) => {
  try {
    const { category } = req.body;

    let filter = {};
    if (category) {
      filter.category = category;
    }

    // Get default settings to reset
    const settingsToReset = defaultSettings.filter(setting => 
      !category || setting.category === category
    );

    const results = [];
    for (const defaultSetting of settingsToReset) {
      await Settings.findOneAndUpdate(
        { key: defaultSetting.key },
        {
          value: defaultSetting.value,
          updatedBy: req.admin.adminId,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      results.push(defaultSetting.key);
    }

    res.json({
      success: true,
      message: `${results.length} settings reset to default`,
      data: { resetKeys: results }
    });
  } catch (err) {
    console.error('Reset settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get public settings (for client apps)
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.find({ isPublic: true })
      .select('key value type category description')
      .sort({ category: 1, key: 1 });

    // Convert to key-value object for easier client consumption
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (err) {
    console.error('Get public settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public settings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Helper function to validate value type
function validateValueType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

module.exports = exports;