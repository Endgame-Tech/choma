const mongoose = require('mongoose');

const DeliveryPriceSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  area: {
    type: String,
    required: false,
    trim: true
  },
  state: {
    type: String,
    required: false,
    trim: true
  },
  country: {
    type: String,
    required: false,
    trim: true,
    default: 'Nigeria'
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Keep old fields for backward compatibility
  latitude: {
    type: Number,
    required: false
  },
  longitude: {
    type: Number,
    required: false
  },
  radius: {
    type: Number,
    required: false
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliveryPrice', DeliveryPriceSchema);
