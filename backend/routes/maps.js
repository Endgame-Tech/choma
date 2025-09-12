const express = require("express");
const router = express.Router();
const { query } = require("express-validator");
const mapsController = require("../controllers/mapsController");
// Note: Removed auth middleware to allow public access for location services

// Places Autocomplete - Public access for signup/address entry
router.get(
  "/places/autocomplete",
  query("input").notEmpty().withMessage("Input is required"),
  query("sessionToken").optional().isString(),
  query("components").optional().isString(),
  query("language").optional().isString(),
  mapsController.placesAutocomplete
);

// Place Details - Public access for address completion
router.get(
  "/places/details",
  query("placeId").notEmpty().withMessage("Place ID is required"),
  query("sessionToken").optional().isString(),
  query("fields").optional().isString(),
  mapsController.placeDetails
);

// Reverse Geocoding - Public access for current location
router.get(
  "/geocode/reverse",
  query("lat").isFloat().withMessage("Valid latitude is required"),
  query("lng").isFloat().withMessage("Valid longitude is required"),
  query("language").optional().isString(),
  mapsController.reverseGeocode
);

module.exports = router;
