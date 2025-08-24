const DeliveryPrice = require('../models/DeliveryPrice');
const mongoose = require('mongoose');
const { Client } = require('@googlemaps/google-maps-services-js');

const googleMapsClient = new Client({});

// Create a new delivery price
exports.createDeliveryPrice = async (req, res) => {
  try {
    const { locationName, price, radius } = req.body;

    if (!locationName || !price || !radius) {
      return res.status(400).json({
        success: false,
        message: 'Location name, price, and radius are required'
      });
    }

    const existingLocation = await DeliveryPrice.findOne({ locationName });
    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: 'Delivery price for this location already exists'
      });
    }

    const geocodeResponse = await googleMapsClient.geocode({
      params: {
        address: locationName,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (geocodeResponse.data.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Could not geocode the location. Please provide a more specific location.',
        error: geocodeResponse.data.status
      });
    }

    const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

    const deliveryPrice = new DeliveryPrice({
      locationName,
      price,
      radius,
      latitude: lat,
      longitude: lng
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

    await deliveryPrice.remove();

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
