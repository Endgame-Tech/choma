import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import CustomIcon from "../ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import api from "../../services/api";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const DeliveryZoneModal = ({
  visible,
  onClose,
  onZoneSelect,
  userAddress = "",
}) => {
  const { colors } = useTheme();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (visible) {
      fetchDeliveryZones();
    }
  }, [visible]);

  const fetchDeliveryZones = async () => {
    setLoading(true);
    try {
      const response = await api.get("/delivery/zones");

      if (response.success) {
        // The backend response structure is { success: true, data: { data: zones, count: number } }
        const zonesData = response.data.data || [];
        setZones(zonesData);
      }
    } catch (error) {
      console.error("Failed to fetch delivery zones:", error);
      Alert.alert("Error", "Failed to load delivery zones. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
  };

  const handleConfirm = () => {
    if (selectedZone) {
      onZoneSelect(selectedZone);
      onClose();
      setSelectedZone(null);
      setSearchQuery(""); // Clear search when closing
    }
  };

  // Filter zones based on search query
  const filteredZones = zones.filter((zone) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      zone.area?.toLowerCase().includes(searchLower) ||
      zone.state?.toLowerCase().includes(searchLower) ||
      zone.country?.toLowerCase().includes(searchLower) ||
      zone.locationName?.toLowerCase().includes(searchLower)
    );
  });

  const renderZoneItem = ({ item }) => {
    const isSelected = selectedZone?._id === item._id;

    return (
      <TouchableOpacity
        style={[
          styles(colors).zoneItem,
          isSelected && styles(colors).selectedZoneItem,
        ]}
        onPress={() => handleZoneSelect(item)}
      >
        <View style={styles(colors).zoneInfo}>
          <View style={styles(colors).zoneHeader}>
            <CustomIcon
              name="location"
              size={20}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles(colors).zoneName,
                isSelected && styles(colors).selectedZoneText,
              ]}
            >
              {item.area || item.locationName}
            </Text>
          </View>

          <Text style={styles(colors).zoneDetails}>
            {item.state}, {item.country || "Nigeria"}
          </Text>
        </View>

        {isSelected && (
          <CustomIcon name="checkmark-circle" size={24} color={colors.success} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles(colors).emptyState}>
      <CustomIcon
        name="location-outline"
        size={48}
        color={colors.textSecondary}
      />
      <Text style={styles(colors).emptyTitle}>No Delivery Zones Available</Text>
      <Text style={styles(colors).emptyMessage}>
        We don't have delivery zones set up yet. Please contact support for
        assistance.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).modalContent}>
          {/* Header */}
          <View style={styles(colors).modalHeader}>
            <View>
              <Text style={styles(colors).modalTitle}>
                Select Delivery Zone
              </Text>
              <Text style={styles(colors).modalSubtitle}>
                Choose the zone closest to your location
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSelectedZone(null);
                onClose();
              }}
              style={styles(colors).closeButton}
            >
              <CustomIcon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* User Address Display */}
          {userAddress ? (
            <View style={styles(colors).addressContainer}>
              <CustomIcon name="home" size={16} color={colors.textSecondary} />
              <Text style={styles(colors).addressText}>
                Your address: {userAddress}
              </Text>
            </View>
          ) : null}

          {/* Search Input */}
          <View style={styles(colors).searchContainer}>
            <View style={styles(colors).searchInputContainer}>
              <CustomIcon name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles(colors).searchInput}
                placeholder="Search by area, state, or country..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <CustomIcon
                    name="close-circle"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Zones List */}
          <View style={styles(colors).listContainer}>
            {loading ? (
              <View style={styles(colors).loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles(colors).loadingText}>
                  Loading delivery zones...
                </Text>
              </View>
            ) : filteredZones && filteredZones.length > 0 ? (
              <ScrollView
                style={styles(colors).scrollView}
                contentContainerStyle={styles(colors).listContent}
                showsVerticalScrollIndicator={true}
              >
                {filteredZones.map((zone) => (
                  <View key={zone._id}>{renderZoneItem({ item: zone })}</View>
                ))}
              </ScrollView>
            ) : zones.length > 0 ? (
              <View style={styles(colors).noResultsContainer}>
                <CustomIcon
                  name="search"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles(colors).noResultsTitle}>
                  No zones found
                </Text>
                <Text style={styles(colors).noResultsMessage}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : (
              renderEmptyState()
            )}
          </View>

          {/* Footer Buttons */}
          <View style={styles(colors).modalFooter}>
            <TouchableOpacity
              style={styles(colors).cancelButton}
              onPress={() => {
                setSearchQuery("");
                setSelectedZone(null);
                onClose();
              }}
            >
              <Text style={styles(colors).cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles(colors).confirmButton,
                !selectedZone && styles(colors).disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!selectedZone}
            >
              <Text
                style={[
                  styles(colors).confirmButtonText,
                  !selectedZone && styles(colors).disabledButtonText,
                ]}
              >
                Confirm Selection
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: THEME.borderRadius.xl,
      borderTopRightRadius: THEME.borderRadius.xl,
      height: "90%",
      paddingTop: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    closeButton: {
      padding: 4,
    },
    addressContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.background,
      margin: 16,
      padding: 12,
      borderRadius: THEME.borderRadius.medium,
    },
    addressText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 4,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    scrollView: {
      flex: 1,
    },
    listContent: {
      paddingVertical: 8,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    noResultsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noResultsMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    zoneItem: {
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    selectedZoneItem: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    zoneInfo: {
      flex: 1,
    },
    zoneHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    zoneName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    selectedZoneText: {
      color: colors.primary,
    },
    zoneDetails: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    selectedPriceText: {
      color: colors.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    modalFooter: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    disabledButton: {
      backgroundColor: colors.textMuted,
    },
    disabledButtonText: {
      color: colors.textSecondary,
    },
  });

export default DeliveryZoneModal;
