import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomText from "../../components/ui/CustomText";
import DeliveryCard from "../../components/delivery/DeliveryCard";
import StatusMessage from "../../components/ui/StatusMessage";
import driverApi from "../../services/driverApi";

const DeliveriesScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { driver } = useDriverAuth();
  const [activeTab, setActiveTab] = useState("available");
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));

  useEffect(() => {
    loadDeliveries();
  }, [activeTab]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      let response;

      switch (activeTab) {
        case "available":
          response = await driverApi.getAvailableDeliveries();
          break;
        case "active":
          response = await driverApi.getActiveDeliveries();
          break;
        case "history":
          response = await driverApi.getDeliveryHistory();
          break;
        default:
          response = { success: false, data: [] };
      }

      if (response.success) {
        setDeliveries(response.data || []);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      console.error("❌ Error loading deliveries:", error);
      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  const handleDeliveryPress = (delivery) => {
    navigation.navigate("DeliveryDetail", {
      assignmentId: delivery._id || delivery.assignmentId,
      delivery,
    });
  };

  const tabs = [
    {
      key: "available",
      title: "Available",
      icon: "flash-outline",
      badge: deliveries.filter((d) => d.status === "assigned").length,
    },
    {
      key: "active",
      title: "Active",
      icon: "car-sport-outline",
      badge: deliveries.filter((d) =>
        ["accepted", "picked_up", "in_transit"].includes(d.status)
      ).length,
    },
    {
      key: "history",
      title: "Completed",
      icon: "checkmark-done-outline",
      badge: null,
    },
  ];

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles(colors).tabButton,
          isActive && styles(colors).activeTabButton,
        ]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <View style={styles(colors).tabContent}>
          <View style={styles(colors).tabIconContainer}>
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? colors.white : colors.textSecondary}
            />
            {tab.badge > 0 && (
              <View style={styles(colors).badgeContainer}>
                <CustomText style={styles(colors).badgeText}>
                  {tab.badge > 99 ? "99+" : tab.badge}
                </CustomText>
              </View>
            )}
          </View>
          <CustomText
            style={[
              styles(colors).tabText,
              isActive && styles(colors).activeTabText,
            ]}
          >
            {tab.title}
          </CustomText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDeliveryItem = ({ item }) => (
    <DeliveryCard
      delivery={item}
      onPress={() => handleDeliveryPress(item)}
      type={activeTab}
    />
  );

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "available":
        return {
          title: "Ready to Earn?",
          message:
            "New delivery opportunities will appear here. Stay online to receive requests!",
          icon: "flash-outline",
          actionText: "Refresh",
          onAction: onRefresh,
        };
      case "active":
        return {
          title: "All Caught Up!",
          message:
            "You have no active deliveries right now. Check available deliveries to start earning.",
          icon: "car-sport-outline",
          actionText: "View Available",
          onAction: () => setActiveTab("available"),
        };
      case "history":
        return {
          title: "Your Journey Starts Here",
          message:
            "Completed deliveries and earnings history will be displayed here.",
          icon: "trophy-outline",
          actionText: null,
          onAction: null,
        };
      default:
        return {
          title: "No Deliveries",
          message: "No deliveries found.",
          icon: "alert-circle-outline",
          actionText: null,
          onAction: null,
        };
    }
  };

  const renderEmptyState = () => {
    const emptyData = getEmptyMessage();
    return (
      <View style={styles(colors).emptyContainer}>
        <View style={styles(colors).emptyIconContainer}>
          <Ionicons name={emptyData.icon} size={80} color={colors.textMuted} />
        </View>
        <CustomText style={styles(colors).emptyTitle}>
          {emptyData.title}
        </CustomText>
        <CustomText style={styles(colors).emptyMessage}>
          {emptyData.message}
        </CustomText>
        {emptyData.actionText && (
          <TouchableOpacity
            style={styles(colors).emptyActionButton}
            onPress={emptyData.onAction}
          >
            <CustomText style={styles(colors).emptyActionText}>
              {emptyData.actionText}
            </CustomText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0.9],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[styles(colors).header, { opacity: headerOpacity }]}
      >
        <View style={styles(colors).headerContent}>
          <View>
            <CustomText style={styles(colors).headerTitle}>
              Deliveries
            </CustomText>
            <CustomText style={styles(colors).headerSubtitle}>
              {activeTab === "available"
                ? "Find your next delivery"
                : activeTab === "active"
                ? "Track your progress"
                : "Review your earnings"}
            </CustomText>
          </View>
          <TouchableOpacity
            style={styles(colors).refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles(colors).container]}>
      {renderHeader()}

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles(colors).tabScrollContainer}
        contentContainerStyle={styles(colors).tabContainer}
      >
        {tabs.map(renderTabButton)}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={styles(colors).loadingText}>
            Loading deliveries...
          </CustomText>
        </View>
      ) : deliveries.length === 0 ? (
        renderEmptyState()
      ) : (
        <Animated.FlatList
          data={deliveries}
          keyExtractor={(item) =>
            item._id || item.assignmentId || Math.random().toString()
          }
          renderItem={renderDeliveryItem}
          contentContainerStyle={styles(colors).listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.background,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "400",
    },
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    tabScrollContainer: {
      flexGrow: 0,
      paddingVertical: 8,
    },
    tabContainer: {
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    tabButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      marginRight: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 100,
    },
    activeTabButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabContent: {
      alignItems: "center",
    },
    tabIconContainer: {
      position: "relative",
      marginBottom: 6,
    },
    badgeContainer: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.white,
    },
    tabText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
    },
    activeTabText: {
      color: colors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    emptyMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    emptyActionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
    emptyActionText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    listContainer: {
      paddingHorizontal: 8,
      paddingBottom: 24,
    },
  });

export default DeliveriesScreen;
