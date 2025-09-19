// src/components/ui/UserAvatar.js - Reusable User Avatar Component
import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const UserAvatar = ({
  user,
  size = 60,
  fontSize = 24,
  imageUri = null,
  style = {},
}) => {
  const { colors } = useTheme();
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset image load error when imageUri or user.profileImage changes
  useEffect(() => {
    setImageLoadError(false);
    setImageLoading(false);
    setRetryCount(0);
  }, [imageUri, user?.profileImage]);

  const avatarSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = {
    fontSize: fontSize,
  };

  // Priority: imageUri prop > user.profileImage > user.avatar > fallback to initials
  let profileImageSource = imageUri || user?.profileImage || user?.avatar;

  // Add cache busting parameter to help with loading issues
  if (profileImageSource && retryCount > 0) {
    const separator = profileImageSource.includes("?") ? "&" : "?";
    profileImageSource = `${profileImageSource}${separator}retry=${retryCount}`;
  }

  console.log("👤 UserAvatar - imageUri:", imageUri);
  console.log("👤 UserAvatar - user.profileImage:", user?.profileImage);
  console.log("👤 UserAvatar - profileImageSource:", profileImageSource);
  console.log("👤 UserAvatar - imageLoadError:", imageLoadError);
  console.log("👤 UserAvatar - imageLoading:", imageLoading);
  console.log("👤 UserAvatar - retryCount:", retryCount);

  const handleImageLoadStart = () => {
    console.log("🖼️ UserAvatar - Image load started");
    setImageLoading(true);
  };

  const handleImageLoadEnd = () => {
    console.log("🖼️ UserAvatar - Image load ended successfully");
    setImageLoading(false);
  };

  const handleImageError = (error) => {
    console.log("❌ UserAvatar - Failed to load profile image:", error);
    console.log("❌ UserAvatar - Image URL was:", profileImageSource);
    console.log("❌ UserAvatar - Retry count:", retryCount);

    // Try to retry loading the image up to 2 times
    if (retryCount < 2) {
      console.log("🔄 UserAvatar - Retrying image load...");
      setRetryCount(retryCount + 1);
      setImageLoading(false);
      // Don't set imageLoadError yet, let it retry
    } else {
      console.log(
        "❌ UserAvatar - Max retries reached, falling back to initials"
      );
      setImageLoadError(true);
      setImageLoading(false);
    }
  };

  if (profileImageSource && !imageLoadError) {
    return (
      <View style={[styles.container, avatarSize, style]}>
        <Image
          source={{ uri: profileImageSource }}
          style={[styles.image, avatarSize]}
          onLoadStart={handleImageLoadStart}
          onLoadEnd={handleImageLoadEnd}
          onError={handleImageError}
          // Add cache policy to help with loading
          cache="reload"
          key={`avatar-${profileImageSource}-${retryCount}`} // Force re-render on retry
        />
        {imageLoading && (
          <View style={[styles.loadingOverlay, avatarSize]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={[styles.gradient, avatarSize]}
            >
              <Text
                style={[styles.initials, textSize, { color: colors.white }]}
              >
                ...
              </Text>
            </LinearGradient>
          </View>
        )}
      </View>
    );
  }

  // Fallback to initials
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <View style={[styles.container, avatarSize, style]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.gradient, avatarSize]}
      >
        <Text style={[styles.initials, textSize, { color: colors.white }]}>
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  image: {
    resizeMode: "cover",
  },
  gradient: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
});

export default UserAvatar;
