import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "../../components/ui/CustomText";
import { DMSansFonts } from "../../constants/fonts";
import { useTheme } from "../../styles/theme";
import { areFontsLoaded, loadAllFonts } from "../../utils/fontLoader";

const DmSansDemoHomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [fontsStatus, setFontsStatus] = useState("Loading...");

  useEffect(() => {
    // Load all fonts for demo
    loadAllFonts().then(() => {
      setFontsStatus(
        areFontsLoaded() ? "Loaded Successfully" : "Failed to Load"
      );
    });
  }, []);

  const showFontStatus = () => {
    const status = areFontsLoaded()
      ? "Loaded Successfully ✅"
      : "Not Loaded ❌";
    Alert.alert("Font Status", `DM Sans fonts are: ${status}`);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.section}>
          <CustomText
            variant="h1"
            style={[styles.demoTitle, { color: colors.text }]}
          >
            DM Sans Font Demo
          </CustomText>
          <CustomText
            variant="body"
            style={[styles.demoSubtitle, { color: colors.textSecondary }]}
          >
            See how DM Sans looks in your Choma app
          </CustomText>

          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: colors.primary }]}
            onPress={showFontStatus}
          >
            <Text style={styles.statusButtonText}>
              Font Status: {fontsStatus}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Typography Showcase */}
        <View style={styles.section}>
          <CustomText
            variant="h2"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Typography Variants
          </CustomText>

          <CustomText
            variant="h1"
            style={{ color: colors.text, marginBottom: 8 }}
          >
            Heading 1 - DM Sans Bold
          </CustomText>

          <CustomText
            variant="h2"
            style={{ color: colors.text, marginBottom: 8 }}
          >
            Heading 2 - DM Sans SemiBold
          </CustomText>

          <CustomText
            variant="h3"
            style={{ color: colors.text, marginBottom: 8 }}
          >
            Heading 3 - DM Sans Medium
          </CustomText>

          <CustomText
            variant="body"
            style={{ color: colors.text, marginBottom: 8 }}
          >
            Body Text - DM Sans Regular (400)
          </CustomText>

          <CustomText
            variant="caption"
            style={{ color: colors.textSecondary, marginBottom: 16 }}
          >
            Caption - DM Sans Medium (500)
          </CustomText>
        </View>

        {/* Stats Demo (like in HomeScreen) */}
        <View style={styles.section}>
          <CustomText
            variant="h2"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Your Stats with DM Sans
          </CustomText>

          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <CustomText
                variant="h3"
                style={[styles.statNumber, { color: colors.text }]}
              >
                247
              </CustomText>
              <CustomText
                variant="caption"
                style={[styles.statLabel, { color: colors.textSecondary }]}
              >
                Meals Delivered
              </CustomText>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <CustomText
                variant="h3"
                style={[styles.statNumber, { color: colors.text }]}
              >
                ₦45,200
              </CustomText>
              <CustomText
                variant="caption"
                style={[styles.statLabel, { color: colors.textSecondary }]}
              >
                Total Spent
              </CustomText>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <CustomText
                variant="h3"
                style={[styles.statNumber, { color: colors.text }]}
              >
                12 days
              </CustomText>
              <CustomText
                variant="caption"
                style={[styles.statLabel, { color: colors.textSecondary }]}
              >
                Best Streak
              </CustomText>
            </View>
          </View>
        </View>

        {/* Font Weight Demo */}
        <View style={styles.section}>
          <CustomText
            variant="h2"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Font Weight Options
          </CustomText>

          <Text
            style={[
              styles.fontDemo,
              { fontFamily: DMSansFonts.regular, color: colors.text },
            ]}
          >
            DM Sans Regular (400) - {DMSansFonts.regular}
          </Text>

          <Text
            style={[
              styles.fontDemo,
              { fontFamily: DMSansFonts.medium, color: colors.text },
            ]}
          >
            DM Sans Medium (500) - {DMSansFonts.medium}
          </Text>

          <Text
            style={[
              styles.fontDemo,
              { fontFamily: DMSansFonts.semiBold, color: colors.text },
            ]}
          >
            DM Sans SemiBold (600) - {DMSansFonts.semiBold}
          </Text>

          <Text
            style={[
              styles.fontDemo,
              { fontWeight: "bold", color: colors.text },
            ]}
          >
            DM Sans Bold (700) - {DMSansFonts.bold}
          </Text>

          <Text
            style={[
              styles.fontDemo,
              { fontFamily: DMSansFonts.extraBold, color: colors.text },
            ]}
          >
            DM Sans ExtraBold (800) - {DMSansFonts.extraBold}
          </Text>

          <Text
            style={[
              styles.fontDemo,
              { fontFamily: DMSansFonts.black, color: colors.text },
            ]}
          >
            DM Sans Black (900) - {DMSansFonts.black}
          </Text>
        </View>

        {/* Comparison Demo */}
        <View style={styles.section}>
          <CustomText
            variant="h2"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Before vs After
          </CustomText>

          <View
            style={[
              styles.comparisonCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <CustomText
              variant="caption"
              style={{ color: colors.textSecondary, marginBottom: 8 }}
            >
              System Font (Before):
            </CustomText>
            <CustomText style={[styles.comparisonText, { color: colors.text }]}>
              Welcome to Choma Food Delivery
            </CustomText>
          </View>

          <View
            style={[
              styles.comparisonCard,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <CustomText
              variant="caption"
              style={{ color: colors.textSecondary, marginBottom: 8 }}
            >
              DM Sans (After):
            </CustomText>
            <CustomText
              variant="body"
              style={[styles.comparisonText, { color: colors.text }]}
            >
              Welcome to Choma Food Delivery
            </CustomText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  demoTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  demoSubtitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    marginBottom: 4,
  },
  statLabel: {
    textAlign: "center",
  },
  fontDemo: {
    fontSize: 16,
    marginBottom: 8,
  },
  comparisonCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  comparisonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  statusButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default DmSansDemoHomeScreen;
