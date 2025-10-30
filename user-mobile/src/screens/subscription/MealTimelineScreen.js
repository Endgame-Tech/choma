import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MealProgressionTimeline from "../../components/subscription/MealProgressionTimeline";
import CustomIcon from "../../components/ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const MealTimelineScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { subscriptionId, subscription } = route.params || {};

  const resolvedSubscriptionId = useMemo(() => {
    if (subscriptionId) return subscriptionId;
    if (subscription?._id) return subscription._id;
    if (subscription?.id) return subscription.id;
    return null;
  }, [subscriptionId, subscription]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <CustomIcon name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.white }]}>
              Meal Timeline
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            {resolvedSubscriptionId ? (
              <MealProgressionTimeline
                subscriptionId={resolvedSubscriptionId}
                onViewFullTimeline={() => {}}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No subscription found</Text>
                <Text style={styles.emptySubtitle}>
                  We couldn't determine which subscription to load. Please try
                  again from your plan details.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const createStyles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    headerSpacer: {
      width: 42,
    },
    content: {
      flex: 1,
      marginTop: 8,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#F8FFFC",
      marginBottom: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.7)",
      textAlign: "center",
      lineHeight: 22,
    },
  });

export default MealTimelineScreen;
