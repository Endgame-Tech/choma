const mongoose = require('mongoose');

const KitchenOperationSchema = new mongoose.Schema({
  kitchenId: { type: String, unique: true },
  kitchenName: { type: String, required: true },
  location: String,
  capacity: Number,
  operatingHours: String,
  contactPerson: String,
  phone: String,
  status: { type: String, enum: ['Active', 'Maintenance', 'Closed'], default: 'Active' },
  specialties: [String]
});

module.exports = mongoose.model('KitchenOperation', KitchenOperationSchema);
