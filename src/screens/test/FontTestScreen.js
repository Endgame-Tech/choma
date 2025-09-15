// src/screens/test/FontTestScreen.js
import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import CustomText from "../../components/ui/CustomText";
import { useTheme } from "../../styles/theme";

const FontTestScreen = () => {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.section}>
        <CustomText variant="h1" style={styles.sectionTitle}>
          DM Sans Font Test
        </CustomText>

        <CustomText variant="h2" style={styles.marginBottom}>
          Typography Variants
        </CustomText>

        {/* Headings */}
        <CustomText variant="h1" style={styles.marginBottom}>
          H1 - Large Heading (DM Sans Bold 32pt)
        </CustomText>

        <CustomText variant="h2" style={styles.marginBottom}>
          H2 - Section Heading (DM Sans Bold 28pt)
        </CustomText>

        <CustomText variant="h3" style={styles.marginBottom}>
          H3 - Subsection (DM Sans SemiBold 24pt)
        </CustomText>

        <CustomText variant="h4" style={styles.marginBottom}>
          H4 - Small Heading (DM Sans SemiBold 20pt)
        </CustomText>

        <CustomText variant="h5" style={styles.marginBottom}>
          H5 - Label Heading (DM Sans SemiBold 18pt)
        </CustomText>

        <CustomText variant="h6" style={styles.marginBottom}>
          H6 - Minor Heading (DM Sans Medium 16pt)
        </CustomText>

        {/* Body Text */}
        <CustomText variant="bodyLarge" style={styles.marginBottom}>
          Body Large - This is large body text using DM Sans Regular at 16pt.
          Perfect for important content that needs to be easily readable.
        </CustomText>

        <CustomText variant="body" style={styles.marginBottom}>
          Body - This is standard body text using DM Sans Regular at 14pt. This
          is the most common text size used throughout the application for
          general content.
        </CustomText>

        <CustomText variant="bodySmall" style={styles.marginBottom}>
          Body Small - This is small body text using DM Sans Regular at 12pt.
          Used for secondary information and captions.
        </CustomText>

        {/* UI Elements */}
        <CustomText variant="label" style={styles.marginBottom}>
          Label - Form labels and UI text (DM Sans Medium 14pt)
        </CustomText>

        <CustomText variant="labelSmall" style={styles.marginBottom}>
          Label Small - Small UI labels (DM Sans Medium 12pt)
        </CustomText>

        <CustomText variant="button" style={styles.marginBottom}>
          Button Text - Action buttons (DM Sans SemiBold 14pt)
        </CustomText>

        <CustomText variant="buttonLarge" style={styles.marginBottom}>
          Button Large - Primary actions (DM Sans SemiBold 16pt)
        </CustomText>

        {/* Special Cases */}
        <CustomText variant="caption" style={styles.marginBottom}>
          Caption - Fine print and disclaimers (DM Sans Regular 11pt)
        </CustomText>

        <CustomText variant="overline" style={styles.marginBottom}>
          OVERLINE - SECTION HEADERS (DM Sans Medium 10pt)
        </CustomText>

        {/* Color Test */}
        <View style={styles.colorSection}>
          <CustomText variant="h3" style={styles.marginBottom}>
            Color Integration Test
          </CustomText>

          <CustomText
            variant="body"
            color={colors.primary}
            style={styles.marginBottom}
          >
            Primary Color Text
          </CustomText>

          <CustomText
            variant="body"
            color={colors.secondary}
            style={styles.marginBottom}
          >
            Secondary Color Text
          </CustomText>

          <CustomText
            variant="body"
            color={colors.error}
            style={styles.marginBottom}
          >
            Error Color Text
          </CustomText>

          <CustomText
            variant="body"
            color={colors.success}
            style={styles.marginBottom}
          >
            Success Color Text
          </CustomText>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    textAlign: "center",
    marginBottom: 30,
  },
  marginBottom: {
    marginBottom: 16,
  },
  colorSection: {
    marginTop: 30,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
});

export default FontTestScreen;
