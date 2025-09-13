import "react-native-get-random-values"; // Must be first import
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import * as Location from "expo-location";

const AddressAutocomplete = ({
  placeholder = "Search for delivery address",
  onAddressSelect,
  defaultValue = "",
  editable = true,
  style = {},
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const API_KEY = "AIzaSyBBxkH4OxFvVDJ242aIOl7auZ2F4Lcf9fg";

  // Keyboard visibility tracking
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Update internal state when defaultValue prop changes (for external updates like "Use current location")
  useEffect(() => {
    if (defaultValue !== query) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchPlaces(query);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchPlaces = async (searchText) => {
    setIsLoading(true);
    try {
      // Use your backend API instead of calling Google directly
      const apiService = require("../../services/api").default;

      const params = new URLSearchParams({
        input: searchText,
        components: "country:ng",
        language: "en",
      });

      console.log(`🗺️ Making request to: /maps/places/autocomplete?${params}`);
      console.log(`🔍 Search text: "${searchText}"`);
      console.log(
        `📍 Full URL: ${apiService.baseURL}/maps/places/autocomplete?${params}`
      );

      const response = await apiService.request(
        `/maps/places/autocomplete?${params}`,
        {
          method: "GET",
        }
      );

      console.log("🗺️ Backend API Response:", response);

      if (response.success && response.data?.data?.predictions) {
        setSuggestions(response.data.data.predictions);
        setShowSuggestions(true);
        console.log(
          "✅ Found predictions:",
          response.data.data.predictions.length
        );
        console.log(
          "📍 First few predictions:",
          response.data.data.predictions.slice(0, 3)
        );
      } else {
        console.log(
          "❌ Backend API Error:",
          response.error || "No predictions"
        );
        console.log(
          "📊 Response structure:",
          JSON.stringify(response, null, 2)
        );
      }
    } catch (error) {
      console.error("Places search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceDetails = async (placeId) => {
    try {
      const apiService = require("../../services/api").default;
      const params = new URLSearchParams({
        placeId: placeId,
        fields:
          "formatted_address,geometry,address_components,name,vicinity,types",
      });
      const response = await apiService.request(
        `/maps/places/details?${params}`,
        {
          method: "GET",
        }
      );

      if (response.success && response.data?.data) {
        const details = response.data.data;
        const addressComponents = details.address_components || [];

        const getComponent = (types) => {
          const component = addressComponents.find((comp) =>
            types.some((type) => comp.types.includes(type))
          );
          return component ? component.long_name : "";
        };

        const addressInfo = {
          fullAddress: details.formatted_address,
          formattedAddress: details.formatted_address,
          coordinates: {
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
          },
          placeId: placeId,
          streetNumber: getComponent(["street_number"]),
          route: getComponent(["route"]),
          locality: getComponent([
            "locality",
            "sublocality",
            "administrative_area_level_2",
          ]),
          adminArea: getComponent(["administrative_area_level_1"]),
          country: getComponent(["country"]),
          postalCode: getComponent(["postal_code"]),
          name: details.name,
          vicinity: details.vicinity,
          types: details.types,
        };

        onAddressSelect && onAddressSelect(addressInfo);
      }
    } catch (error) {
      console.error("Place details error:", error);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    getPlaceDetails(suggestion.place_id);
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      // Use reverse geocoding to get address from coordinates
      const apiService = require("../../services/api").default;
      const params = new URLSearchParams({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      const response = await apiService.request(
        `/maps/geocode/reverse?${params}`,
        {
          method: "GET",
        }
      );

      if (
        response.success &&
        response.data?.data &&
        response.data.data.length > 0
      ) {
        const result = response.data.data[0];
        const addressInfo = {
          fullAddress: result.formatted_address,
          formattedAddress: result.formatted_address,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          placeId: result.place_id,
        };

        setQuery(result.formatted_address);
        onAddressSelect && onAddressSelect(addressInfo);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      alert("Unable to get current location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles(colors).suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons name="location-outline" size={16} color={colors.textMuted} />
      <Text style={styles(colors).suggestionText} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles(colors).container, style]}>
      <View style={styles(colors).inputContainer}>
        <Ionicons
          name="location-outline"
          size={20}
          color={colors.textMuted}
          style={styles(colors).leftIcon}
        />
        <TextInput
          style={styles(colors).textInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          onBlur={() => {
            // Always use timeout to allow suggestion clicks regardless of keyboard state
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          editable={editable}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles(colors).loadingIcon}
          />
        )}
        <TouchableOpacity
          onPress={getCurrentLocation}
          disabled={isGettingLocation}
          style={styles(colors).rightIconContainer}
        >
          <Ionicons
            name={isGettingLocation ? "refresh" : "navigate-circle"}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles(colors).suggestionsContainer}>
          <View style={styles(colors).suggestionsList}>
            {suggestions.map((item) => renderSuggestion({ item }))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      zIndex: 1000,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      minHeight: 50,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    leftIcon: {
      marginRight: 8,
    },
    loadingIcon: {
      marginHorizontal: 8,
    },
    rightIconContainer: {
      marginLeft: 8,
      padding: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    suggestionsContainer: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 5,
      maxHeight: 200,
      shadowColor: colors.black || "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1001,
    },
    suggestionsList: {
      flex: 1,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    suggestionText: {
      marginLeft: 12,
      fontSize: 15,
      color: colors.text,
      flex: 1,
      fontWeight: "400",
      lineHeight: 20,
    },
  });

export default AddressAutocomplete;
