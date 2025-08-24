const mongoose = require('mongoose');

const DeliveryPriceSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  radius: {
    type: Number,
    required: true, // in kilometers
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliveryPrice', DeliveryPriceSchema);
