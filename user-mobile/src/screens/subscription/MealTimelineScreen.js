import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MealProgressionTimeline from "../../components/subscription/MealProgressionTimeline";
import CustomIcon from "../../components/ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const BACKGROUND_COLOR = "#552111";
const PRIMARY_GOLD = "#F7AE1A";

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
      <StatusBar barStyle="light-content" backgroundColor={BACKGROUND_COLOR} />
      <ImageBackground
        source={require("../../../assets/patternchoma.png")}
        resizeMode="repeat"
        style={styles.backgroundPattern}
        imageStyle={styles.backgroundImageStyle}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <CustomIcon name="chevron-back" size={24} color={PRIMARY_GOLD} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Timeline</Text>
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
    </View>
  );
};

const createStyles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: BACKGROUND_COLOR,
    },
    backgroundPattern: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      opacity: 0.8,
      backgroundColor: BACKGROUND_COLOR,
    },
    backgroundImageStyle: {
      opacity: 1,
      transform: [{ scale: 2.4 }],
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
      borderColor: "rgba(247, 174, 26, 0.4)",
      backgroundColor: "rgba(0,0,0,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: PRIMARY_GOLD,
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
      color: "#FFFFFF",
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
