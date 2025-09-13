import React from "react";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../styles/theme";

const RefreshableScrollContainer = ({
  children,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  ...props
}) => {
  const { colors } = useTheme();

  if (!colors) {
    console.error("❌ RefreshableScrollContainer: colors is undefined - theme context missing");
    return null;
  }

  return (
    <ScrollView
      style={styles(colors).container}
      contentContainerStyle={[
        styles(colors).contentContainer,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.cardBackground}
          titleColor={colors.text}
        />
      }
      {...props}
    >
      {children}
      
      {/* Bottom padding to account for tab bar */}
      <View style={styles(colors).bottomPadding} />
    </ScrollView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flexGrow: 1,
    },
    bottomPadding: {
      height: 100, // Space for bottom tab bar
    },
  });

export default RefreshableScrollContainer;