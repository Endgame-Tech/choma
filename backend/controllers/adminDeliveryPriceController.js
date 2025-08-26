const DeliveryPrice = require('../models/DeliveryPrice');
const mongoose = require('mongoose');
const { Client } = require('@googlemaps/google-maps-services-js');

const googleMapsClient = new Client({});

// Create a new delivery price
exports.createDeliveryPrice = async (req, res) => {
  try {
    // Handle both locationName and location field names for compatibility
    const { locationName, location, price, radius, isDefault, state, latitude, longitude, area, country } = req.body;
    const actualLocationName = locationName || location;
    const actualRadius = radius || 10; // Default 10km radius if not provided

    if (!actualLocationName || !price) {
      return res.status(400).json({
        success: false,
        message: 'Location name and price are required'
      });
    }

    const existingLocation = await DeliveryPrice.findOne({ 
      locationName: { $regex: new RegExp(`^${actualLocationName}$`, 'i') }
    });
    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: `Delivery price for location "${actualLocationName}" already exists. Please use a different location name or update the existing one.`
      });
    }

    // Handle coordinates - use provided lat/lng or geocode the address
    let lat = latitude, lng = longitude;
    
    if (!lat || !lng) {
      if (!isDefault) {
        const geocodeResponse = await googleMapsClient.geocode({
          params: {
            address: actualLocationName,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (geocodeResponse.data.status !== 'OK') {
          return res.status(400).json({
            success: false,
            message: 'Could not geocode the location. Please provide a more specific location or coordinates.',
            error: geocodeResponse.data.status
          });
        }

        const location = geocodeResponse.data.results[0].geometry.location;
        lat = location.lat;
        lng = location.lng;
      }
    }

    const deliveryPrice = new DeliveryPrice({
      locationName: actualLocationName,
      area: area || null,
      state: state || null,
      country: country || 'Nigeria',
      price: Number(price),
      radius: actualRadius,
      latitude: lat,
      longitude: lng,
      isDefault: isDefault || false
    });

    await deliveryPrice.save();

    res.status(201).json({
      success: true,
      message: 'Delivery price created successfully',
      data: deliveryPrice
    });
  } catch (err) {
    console.error('Create delivery price error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery price',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get all delivery prices
exports.getDeliveryPrices = async (req, res) => {
  try {
    const deliveryPrices = await DeliveryPrice.find();

    res.json({
      success: true,
      data: deliveryPrices
    });
  } catch (err) {
    console.error('Get all delivery prices error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery prices',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update a delivery price
exports.updateDeliveryPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, radius, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery price ID'
      });
    }

    const deliveryPrice = await DeliveryPrice.findById(id);
    if (!deliveryPrice) {
      return res.status(404).json({
        success: false,
        message: 'Delivery price not found'
      });
    }

    if (price) {
      deliveryPrice.price = price;
    }

    if (radius) {
      deliveryPrice.radius = radius;
    }

    if (typeof isActive === 'boolean') {
      deliveryPrice.isActive = isActive;
    }

    await deliveryPrice.save();

    res.json({
      success: true,
      message: 'Delivery price updated successfully',
      data: deliveryPrice
    });
  } catch (err) {
    console.error('Update delivery price error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery price',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete a delivery price
exports.deleteDeliveryPrice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery price ID'
      });
    }

    const deliveryPrice = await DeliveryPrice.findById(id);
    if (!deliveryPrice) {
      return res.status(404).json({
        success: false,
        message: 'Delivery price not found'
      });
    }

    await DeliveryPrice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Delivery price deleted successfully'
    });
  } catch (err) {
    console.error('Delete delivery price error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery price',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
