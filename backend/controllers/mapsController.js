const axios = require("axios");

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Places Autocomplete
exports.placesAutocomplete = async (req, res) => {
  try {
    const {
      input,
      sessionToken,
      components = "country:ng",
      language = "en",
    } = req.query;

    if (!input) {
      return res.status(400).json({
        success: false,
        message: "Input parameter is required",
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key not configured");
      return res.status(500).json({
        success: false,
        message: "Maps service not available",
      });
    }

    // Use establishment and geocode types for better results like Uber/delivery apps
    const params = {
      input,
      key: GOOGLE_MAPS_API_KEY,
      components,
      language,
      // Remove types restriction or use broader types for better results
      types: "(regions)", // This gives cities, neighborhoods, and administrative areas
    };

    if (sessionToken) {
      params.sessiontoken = sessionToken;
    }

    console.log("🗺️ Making Google Places Autocomplete request for:", input);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      {
        params,
        timeout: 10000,
      }
    );

    const data = response.data;
    console.log("🌐 Google API Response status:", data.status);

    if (data.status === "OK") {
      // Filter and enhance results like real delivery apps
      const enhancedPredictions = data.predictions.map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        structured_formatting: prediction.structured_formatting,
        types: prediction.types,
        // Add distance if available
        distance_meters: prediction.distance_meters,
        matched_substrings: prediction.matched_substrings,
      }));

      res.json({
        success: true,
        data: {
          predictions: enhancedPredictions,
          status: data.status,
        },
      });
    } else if (data.status === "ZERO_RESULTS") {
      // Try without type restrictions for broader search
      const fallbackParams = {
        input,
        key: GOOGLE_MAPS_API_KEY,
        components,
        language,
        // No types restriction for broader results
      };

      if (sessionToken) {
        fallbackParams.sessiontoken = sessionToken;
      }

      console.log("🔄 Trying fallback search without type restrictions");

      const fallbackResponse = await axios.get(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json",
        {
          params: fallbackParams,
          timeout: 10000,
        }
      );

      const fallbackData = fallbackResponse.data;

      if (fallbackData.status === "OK") {
        res.json({
          success: true,
          data: {
            predictions: fallbackData.predictions,
            status: fallbackData.status,
          },
        });
      } else {
        res.json({
          success: true,
          data: {
            predictions: [],
            status: "ZERO_RESULTS",
          },
        });
      }
    } else {
      console.error(
        "Google Places API error:",
        data.error_message || data.status
      );
      res.status(400).json({
        success: false,
        message: data.error_message || `Places API error: ${data.status}`,
        status: data.status,
      });
    }
  } catch (error) {
    console.error("Places autocomplete error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch place suggestions",
    });
  }
};

// Place Details
exports.placeDetails = async (req, res) => {
  try {
    const {
      placeId,
      sessionToken,
      fields = "formatted_address,geometry,address_components,name,vicinity,types",
    } = req.query;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: "Place ID parameter is required",
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Maps service not available",
      });
    }

    const params = {
      place_id: placeId,
      key: GOOGLE_MAPS_API_KEY,
      fields,
    };

    if (sessionToken) {
      params.sessiontoken = sessionToken;
    }

    console.log("🗺️ Making Google Place Details request for:", placeId);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params,
        timeout: 10000,
      }
    );

    const data = response.data;

    if (data.status === "OK") {
      res.json({
        success: true,
        data: data.result,
      });
    } else {
      console.error(
        "Google Place Details API error:",
        data.error_message || data.status
      );
      res.status(400).json({
        success: false,
        message:
          data.error_message || `Place Details API error: ${data.status}`,
        status: data.status,
      });
    }
  } catch (error) {
    console.error("Place details error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch place details",
    });
  }
};

// Reverse Geocoding
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng, language = "en" } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude parameters are required",
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Maps service not available",
      });
    }

    const params = {
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      language,
    };

    console.log(
      "🗺️ Making Google Reverse Geocoding request for:",
      `${lat},${lng}`
    );

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params,
        timeout: 10000,
      }
    );

    const data = response.data;

    if (data.status === "OK") {
      res.json({
        success: true,
        data: data.results,
      });
    } else {
      console.error(
        "Google Geocoding API error:",
        data.error_message || data.status
      );
      res.status(400).json({
        success: false,
        message: data.error_message || `Geocoding API error: ${data.status}`,
        status: data.status,
      });
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reverse geocode location",
    });
  }
};
