import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import locationService from "../../services/locationService";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const LocationSelector = ({ onLocationSelect, initialLocation, style }) => {
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryZone, setDeliveryZone] = useState(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [customAddress, setCustomAddress] = useState("");

  useEffect(() => {
    if (initialLocation) {
      loadLocationDetails(initialLocation);
    }
  }, [initialLocation]);

  const loadLocationDetails = async (location) => {
    try {
      setLoading(true);

      // Get address from coordinates
      const addressResult = await locationService.reverseGeocode(location);
      if (addressResult) {
        setAddress(addressResult.formattedAddress);
      }

      // Get delivery zone and estimate
      const zone = await locationService.getDeliveryZone(location);
      setDeliveryZone(zone);

      if (zone) {
        const estimate = await locationService.getDeliveryEstimate(location);
        setDeliveryEstimate(estimate);
      }
    } catch (error) {
      console.error("Error loading location details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);

      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);

      await loadLocationDetails(location);

      onLocationSelect && onLocationSelect(location);
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your location permissions.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async (searchAddress) => {
    try {
      setLoading(true);

      const location = await locationService.geocode(searchAddress);
      if (location) {
        setCurrentLocation(location);
        await loadLocationDetails(location);
        onLocationSelect && onLocationSelect(location);
        setModalVisible(false);
      } else {
        Alert.alert(
          "Location Not Found",
          "Could not find the specified address. Please try a different address.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error searching location:", error);
      Alert.alert(
        "Search Error",
        "An error occurred while searching for the address. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAddressSubmit = () => {
    if (!customAddress.trim()) {
      Alert.alert("Error", "Please enter an address");
      return;
    }

    searchLocation(customAddress.trim());
  };

  const getDeliveryStatus = () => {
    if (!deliveryZone) {
      return {
        available: false,
        message: "Delivery not available in this area",
        color: "#F44336",
        icon: "close-circle",
      };
    }

    return {
      available: true,
      message: `Delivery available in ${deliveryZone.name}`,
      color: "#4CAF50",
      icon: "checkmark-circle",
    };
  };

  const status = getDeliveryStatus();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="location" size={20} color="#333333" />
        <Text style={styles.headerText}>Delivery Location</Text>
      </View>

      <TouchableOpacity
        style={styles.locationContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.locationInfo}>
          <Text style={styles.addressText}>
            {address || "Select delivery location"}
          </Text>
          {currentLocation && (
            <Text style={styles.coordinatesText}>
              {currentLocation.latitude.toFixed(6)},{" "}
              {currentLocation.longitude.toFixed(6)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666666" />
      </TouchableOpacity>

      <View style={styles.statusContainer}>
        <Ionicons name={status.icon} size={16} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.message}
        </Text>
      </View>

      {deliveryEstimate && deliveryEstimate.available && (
        <View style={styles.estimateContainer}>
          <View style={styles.estimateItem}>
            <Text style={styles.estimateLabel}>Delivery Fee:</Text>
            <Text style={styles.estimateValue}>₦{deliveryEstimate.fee}</Text>
          </View>
          <View style={styles.estimateItem}>
            <Text style={styles.estimateLabel}>Estimated Time:</Text>
            <Text style={styles.estimateValue}>
              {deliveryEstimate.estimatedTime}
            </Text>
          </View>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.locationOption}
                onPress={getCurrentLocation}
                disabled={loading}
              >
                <Ionicons name="locate" size={20} color="#4CAF50" />
                <Text style={styles.locationOptionText}>
                  Use Current Location
                </Text>
                {loading && <ActivityIndicator size="small" color="#4CAF50" />}
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Search Address</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter address or landmark"
                  value={customAddress}
                  onChangeText={setCustomAddress}
                  multiline
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleCustomAddressSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: "#666666",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  estimateContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
  },
  estimateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  estimateLabel: {
    fontSize: 14,
    color: "#666666",
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  locationOptionText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
  },
});

export default LocationSelector;
