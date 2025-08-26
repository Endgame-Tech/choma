// Script to set up default delivery zones for testing
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const DeliveryPriceSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
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
    required: true,
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  state: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

const DeliveryPrice = mongoose.model('DeliveryPrice', DeliveryPriceSchema);

const defaultZones = [
  {
    locationName: 'Utako, FCT, Nigeria',
    area: 'Utako',
    state: 'FCT',
    country: 'Nigeria',
    price: 1500,
    isActive: true
  },
  {
    locationName: 'Victoria Island, Lagos, Nigeria',
    area: 'Victoria Island',
    state: 'Lagos',
    country: 'Nigeria',
    price: 1200,
    isActive: true
  },
  {
    locationName: 'Ikeja, Lagos, Nigeria',
    area: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',
    price: 1000,
    isActive: true
  },
  {
    locationName: 'Surulere, Lagos, Nigeria',
    area: 'Surulere',
    state: 'Lagos',
    country: 'Nigeria',
    price: 1100,
    isActive: true
  },
  {
    locationName: 'Lekki, Lagos, Nigeria',
    area: 'Lekki',
    state: 'Lagos',
    country: 'Nigeria',
    price: 1300,
    isActive: true
  },
  {
    locationName: 'Abuja Central, FCT, Nigeria',
    area: 'Abuja Central',
    state: 'FCT',
    country: 'Nigeria',
    price: 1800,
    isActive: true
  }
];

async function setupDeliveryZones() {
  try {
    console.log('🚀 Setting up delivery zones...');
    
    // Clear existing zones
    await DeliveryPrice.deleteMany({});
    console.log('🗑️ Cleared existing zones');
    
    // Insert new zones
    for (const zone of defaultZones) {
      try {
        const newZone = await DeliveryPrice.create(zone);
        console.log(`✅ Created zone: ${newZone.locationName} - ₦${newZone.price}`);
      } catch (error) {
        console.error(`❌ Failed to create zone ${zone.locationName}:`, error.message);
      }
    }
    
    console.log('🎉 Delivery zones setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDeliveryZones();