import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const ProfileStats = ({ userStats, statsLoading, onWalletPress }) => {
  const { colors } = useTheme();
  const statCards = [
    {
      id: "meals",
      icon: "bag-outline",
      value: statsLoading ? null : userStats.ordersThisMonth || 0,
      label: "This Month",
      color: colors.primary,
    },
    {
      id: "streak",
      icon: "flame",
      value: statsLoading ? null : userStats.streakDays || 0,
      label: "Day Streak",
      color: colors.rating || colors.primary,
    },
    {
      id: "completed",
      icon: "trophy",
      value: statsLoading ? null : userStats.totalOrdersCompleted || 0,
      label: "Completed",
      color: colors.success || colors.primary,
    },
    {
      id: "wallet",
      icon: "wallet-outline",
      value: statsLoading
        ? null
        : userStats.totalSaved === 0 || isNaN(userStats.totalSaved)
          ? 0
          : `₦${(userStats.totalSaved / 1000).toFixed(0)}k`,
      label: "Saved",
      color: colors.primary,
      isClickable: true,
    },
  ];

  return (
    <View style={styles(colors).container}>
      <Text style={styles(colors).sectionTitle}>Quick Stats</Text>
      <View style={styles(colors).statsGrid}>
        {statCards.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles(colors).statCard}
            onPress={stat.isClickable ? onWalletPress : null}
            activeOpacity={stat.isClickable ? 0.7 : 1}
          >
            <View
              style={[
                styles(colors).iconContainer,
                { backgroundColor: `${stat.color}20` },
              ]}
            >
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            {statsLoading ? (
              <ActivityIndicator
                size="small"
                color={stat.color}
                style={{ marginVertical: 10 }}
              />
            ) : (
              <Text style={styles(colors).statValue}>{stat.value}</Text>
            )}
            <Text style={styles(colors).statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      // marginBottom: 20,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 15,
    },
    statCard: {
      width: (width - 55) / 2,
      backgroundColor: `${colors.cardBackground}20`,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      // marginBottom: 12,
      borderWidth: 1,
      borderColor: `${colors.primary}15`,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default ProfileStats;
