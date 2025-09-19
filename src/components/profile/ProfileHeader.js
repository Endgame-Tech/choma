import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "../ui/UserAvatar";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const ProfileHeader = ({
  user,
  profileImage,
  isOffline,
  isEditing,
  onSettingsPress,
  onSharePress,
  onEditPress,
}) => {
  const { colors } = useTheme();

  const formatUserName = (fullName) => {
    if (!fullName) return { firstName: "ANDY", lastName: "ROWLAND" };

    const names = fullName.trim().split(" ");
    if (names.length === 1) {
      // If only one name, show it on first line
      const name = names[0].toUpperCase();
      return {
        firstName: name.length > 12 ? name.substring(0, 12) + "..." : name,
        lastName: "",
      };
    } else if (names.length === 2) {
      // If two names, show first on first line, last on second line
      const firstName = names[0].toUpperCase();
      const lastName = names[1].toUpperCase();
      return {
        firstName:
          firstName.length > 12
            ? firstName.substring(0, 12) + "..."
            : firstName,
        lastName:
          lastName.length > 12 ? lastName.substring(0, 12) + "..." : lastName,
      };
    } else {
      // If more than two names, show first name on first line and last name on second line
      const firstName = names[0].toUpperCase();
      const lastName = names[names.length - 1].toUpperCase();
      return {
        firstName:
          firstName.length > 12
            ? firstName.substring(0, 12) + "..."
            : firstName,
        lastName:
          lastName.length > 12 ? lastName.substring(0, 12) + "..." : lastName,
      };
    }
  };

  const { firstName, lastName } = formatUserName(user?.fullName);

  return (
    <View style={styles(colors).container}>
      {/* Background with user photo */}
      <View style={styles(colors).imageBackground}>
        {profileImage || user?.profileImage ? (
          <Image
            source={{ uri: profileImage || user?.profileImage }}
            style={styles(colors).backgroundImage}
            onError={() =>
              console.log("Profile background image failed to load")
            }
          />
        ) : (
          <View style={styles(colors).yellowBackground} />
        )}
        {/* Optional overlay for better text readability */}
        <View style={styles(colors).backgroundOverlay} />
      </View>

      {/* Dark bottom section */}
      <View style={styles(colors).darkSection}>
        {/* Content Row */}
        <View style={styles(colors).contentRow}>
          {/* Left side - Name and Email */}
          <View style={styles(colors).leftContent}>
            <View style={styles(colors).nameContainer}>
              <Text style={styles(colors).userName}>{firstName}</Text>
              {lastName && (
                <Text style={styles(colors).userName}>{lastName}</Text>
              )}
            </View>
            <Text style={styles(colors).userEmail}>
              {user?.email || "andy@gmail.com"}
            </Text>
          </View>

          {/* Right side - Icons and Edit Button */}
          <View style={styles(colors).rightContent}>
            <View style={styles(colors).rightButtons}>
              <TouchableOpacity
                style={styles(colors).headerButton}
                onPress={onSharePress}
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles(colors).headerButton}
                onPress={onSettingsPress}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles(colors).editButton}
              onPress={onEditPress}
            >
              <Text style={styles(colors).editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Bottom stroke */}
        <View style={styles(colors).bottomStroke} />
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.background,
    },
    imageBackground: {
      height: 400,
      position: "relative",
      overflow: "hidden",
    },
    backgroundImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    yellowBackground: {
      backgroundColor: colors.primary,
      width: "100%",
      height: "100%",
    },
    backgroundOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.3)", // Dark overlay for text readability
    },
    darkSection: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: -20,
    },
    contentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: 20,
    },
    leftContent: {
      flex: 1,
    },
    rightContent: {
      alignItems: "flex-end",
    },
    nameContainer: {
      marginBottom: 8,
    },
    rightButtons: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 12,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.text}15`,
      justifyContent: "center",
      alignItems: "center",
    },
    userName: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      letterSpacing: 0.5,
      lineHeight: 32,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textMuted,
    },
    editButton: {
      borderWidth: 1,
      borderColor: `${colors.text}50`,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 25,
    },
    editButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    bottomStroke: {
      height: 1,
      backgroundColor: `${colors.white}15`,
      width: "100%",
      marginTop: 30,
    },
  });

export default ProfileHeader;
