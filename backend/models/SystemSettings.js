const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  settingType: {
    type: String,
    enum: ['number', 'string', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['pricing', 'features', 'limits', 'general'],
    required: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

// Pre-save middleware to update timestamp
SystemSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get setting by key
SystemSettingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ settingKey: key });
  return setting ? setting.settingValue : null;
};

// Static method to update setting by key
SystemSettingsSchema.statics.updateSetting = async function (key, value, adminId) {
  const setting = await this.findOne({ settingKey: key });

  if (!setting) {
    throw new Error(`Setting ${key} not found`);
  }

  if (!setting.isEditable) {
    throw new Error(`Setting ${key} is not editable`);
  }

  setting.settingValue = value;
  setting.updatedBy = adminId;

  return setting.save();
};

// Static method to initialize default settings
SystemSettingsSchema.statics.initializeDefaults = async function () {
  const DEFAULT_SETTINGS = [
    {
      settingKey: 'CUSTOM_PLAN_FEE_PERCENT',
      settingValue: 15,
      settingType: 'number',
      description: 'Customization fee percentage for custom meal plans',
      category: 'pricing',
      isEditable: true
    },
    {
      settingKey: 'CUSTOM_PLAN_MIN_WEEKS',
      settingValue: 4,
      settingType: 'number',
      description: 'Minimum duration for custom meal plans (weeks)',
      category: 'limits',
      isEditable: true
    },
    {
      settingKey: 'CUSTOM_PLAN_MAX_WEEKS',
      settingValue: 4,
      settingType: 'number',
      description: 'Maximum duration for custom meal plans (weeks)',
      category: 'limits',
      isEditable: true
    },
    {
      settingKey: 'CUSTOM_PLAN_ENABLED',
      settingValue: true,
      settingType: 'boolean',
      description: 'Enable/disable custom meal plan feature',
      category: 'features',
      isEditable: true
    },
    {
      settingKey: 'CUSTOM_PLAN_MAX_EXCLUDED_INGREDIENTS',
      settingValue: 10,
      settingType: 'number',
      description: 'Maximum number of ingredients user can exclude',
      category: 'limits',
      isEditable: true
    }
  ];

  for (const setting of DEFAULT_SETTINGS) {
    const exists = await this.findOne({ settingKey: setting.settingKey });
    if (!exists) {
      await this.create(setting);
      console.log(`✓ Created default setting: ${setting.settingKey}`);
    }
  }

  console.log('✓ System settings initialized');
};

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
