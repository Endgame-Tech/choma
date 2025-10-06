import React from "react";
import { View, StyleSheet } from "react-native";
import CustomTabBar from "./CustomTabBar";

// Wrapper component to render screens with custom tab bar
const ScreenWithTabBar = ({ children, showTabBar = true }) => {
  return (
    <View style={styles.container}>
      {children}
      {showTabBar && <CustomTabBar />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenWithTabBar;
