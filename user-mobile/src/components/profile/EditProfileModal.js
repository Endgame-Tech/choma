// src/components/profile/EditProfileModal.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { DIETARY_PREFERENCES } from "../../utils/profileConstants";
import { APP_CONFIG } from "../../utils/constants";
import UserAvatar from "../ui/UserAvatar";
import AddressAutocomplete from "../ui/AddressAutocomplete";
import CloudStorageService from "../../services/cloudStorage";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const EditProfileModal = ({
  visible,
  user,
  editableUser,
  setEditableUser,
  profileImage,
  setProfileImage,
  errors,
  isLoading,
  isImageUploading,
  setIsImageUploading,
  onCancel,
  onSave,
  onToggleDietaryPreference,
  updateUserProfile,
  setUser,
  showError,
  showSuccess,
  showInfo,
  showConfirm,
  loadProfileImage,
  refreshProfileImage,
}) => {
  const { colors } = useTheme();

  // Image picker functions
  const pickImage = async () => {
    showInfo(
      "Update Profile Picture",
      "Choose how you want to update your profile picture",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => selectFromLibrary(),
        },
        ...(profileImage
          ? [
              {
                text: "Remove Photo",
                style: "destructive",
                onPress: () => removeProfilePicture(),
              },
            ]
          : []),
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "You need to grant permission to access your camera"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showError("Error", "Failed to take photo");
    }
  };

  const selectFromLibrary = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "You need to grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showError("Error", "Failed to select image");
    }
  };

  const processSelectedImage = async (imageUri) => {
    try {
      // Use separate loading state for image upload
      setIsImageUploading(true);

      // Immediately show the image locally for better UX
      setProfileImage(imageUri);

      console.log("Uploading profile image to production server...");
      console.log(
        "Upload URL will be:",
        APP_CONFIG.API_BASE_URL.replace("/api", "") +
          "/api/upload/profile-image"
      );

      // Upload to backend server
      const cloudImageUrl = await CloudStorageService.uploadToBackend(
        imageUri,
        user.email
      );

      console.log("Image uploaded successfully to:", cloudImageUrl);

      // Update user profile with cloud URL
      console.log("📤 Updating profile with image URL:", cloudImageUrl);

      // Include current user data to avoid validation errors
      // Ensure fullName meets minimum requirements
      const fullName = user?.fullName || "";
      const validFullName = fullName.length >= 2 ? fullName : "User Name";

      const profileUpdateData = {
        fullName: validFullName,
        phone: user?.phone || "",
        address: user?.address || "",
        dietaryPreferences: user?.dietaryPreferences || [],
        allergies: user?.allergies || "",
        profileImage: cloudImageUrl,
        // Include user ID if available (some backends require it)
        ...(user?.id && { id: user.id }),
        ...(user?.customerId && { customerId: user.customerId }),
      };

      console.log("📤 Profile update data:", profileUpdateData);
      const profileUpdateResult = await updateUserProfile(profileUpdateData);

      console.log("📤 Profile update result:", profileUpdateResult);

      if (!profileUpdateResult.success) {
        throw new Error(
          profileUpdateResult.message || "Failed to update profile"
        );
      }

      // Save cloud URL locally as well
      await AsyncStorage.setItem("profileImage", cloudImageUrl);

      console.log("Profile image updated successfully");
      showSuccess("Success", "Profile picture updated successfully!");

      // Update local context directly instead of making redundant API call
      setUser({ ...user, profileImage: cloudImageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);

      // Show more specific error message
      let errorMessage = "Failed to save profile picture";
      if (error.message.includes("Network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes("Upload failed")) {
        errorMessage = "Upload failed. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError("Upload Error", errorMessage);

      // Revert the image to original state
      setProfileImage(user?.profileImage || null);
      await loadProfileImage();
    } finally {
      setIsImageUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    showConfirm(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      async () => {
        try {
          setIsImageUploading(true);
          setProfileImage(null);

          // Update user profile - include all user data to avoid validation errors
          // Ensure fullName meets minimum requirements
          const fullName = user?.fullName || "";
          const validFullName = fullName.length >= 2 ? fullName : "User Name";

          const profileUpdateData = {
            fullName: validFullName,
            phone: user?.phone || "",
            address: user?.address || "",
            dietaryPreferences: user?.dietaryPreferences || [],
            allergies: user?.allergies || "",
            profileImage: null,
            // Include user ID if available (some backends require it)
            ...(user?.id && { id: user.id }),
            ...(user?.customerId && { customerId: user.customerId }),
          };

          await updateUserProfile(profileUpdateData);

          // Remove from local storage
          await AsyncStorage.removeItem("profileImage");

          console.log("Profile image removed successfully");
          showSuccess("Success", "Profile picture removed successfully!");

          // Refresh user profile to get updated data
          await refreshProfileImage();
        } catch (error) {
          console.error("Error removing profile image:", error);
          showError("Error", "Failed to remove profile picture");
          // Revert
          setProfileImage(user.profileImage || null);
        } finally {
          setIsImageUploading(false);
        }
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles(colors).editModalContainer}>
        <View style={styles(colors).editHeader}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles(colors).editCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles(colors).editTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={onSave}
            disabled={isLoading || isImageUploading}
          >
            <Text
              style={[
                styles(colors).editSaveText,
                (isLoading || isImageUploading) &&
                  styles(colors).editSaveTextDisabled,
              ]}
            >
              {isLoading
                ? "Saving Profile..."
                : isImageUploading
                ? "Uploading Image..."
                : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles(colors).editScrollContainer}
          contentContainerStyle={styles(colors).editScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Profile Picture */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>Profile Picture</Text>
            <View style={styles(colors).profilePictureSection}>
              <TouchableOpacity
                style={styles(colors).profilePictureContainer}
                onPress={pickImage}
                activeOpacity={0.9}
              >
                <UserAvatar
                  user={user}
                  size={100}
                  fontSize={36}
                  imageUri={profileImage}
                />
                <View style={styles(colors).profilePictureOverlay}>
                  <Ionicons name="camera" size={24} color={colors.white} />
                </View>
              </TouchableOpacity>
              <View style={styles(colors).profilePictureInfo}>
                <Text style={styles(colors).profilePictureTitle}>
                  Update Profile Picture
                </Text>
                <Text style={styles(colors).profilePictureSubtitle}>
                  Tap the image above to change your profile picture
                </Text>
                <Text style={styles(colors).profilePictureHint}>
                  JPG, PNG up to 5MB
                </Text>
              </View>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>Full Name *</Text>
            <TextInput
              style={[
                styles(colors).editInput,
                errors.fullName && styles(colors).editInputError,
              ]}
              value={editableUser.fullName}
              onChangeText={(text) =>
                setEditableUser((prev) => ({ ...prev, fullName: text }))
              }
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
            />
            {errors.fullName && (
              <Text style={styles(colors).editErrorText}>
                {errors.fullName}
              </Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>Phone Number</Text>
            <TextInput
              style={[
                styles(colors).editInput,
                errors.phone && styles(colors).editInputError,
              ]}
              value={editableUser.phone}
              onChangeText={(text) =>
                setEditableUser((prev) => ({ ...prev, phone: text }))
              }
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={styles(colors).editErrorText}>{errors.phone}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>Address</Text>
            <View style={styles(colors).autocompleteContainer}>
              <AddressAutocomplete
                placeholder="Enter your delivery address"
                onAddressSelect={(addressInfo) => {
                  setEditableUser((prev) => ({
                    ...prev,
                    address: addressInfo.formattedAddress,
                  }));
                }}
                defaultValue={editableUser.address}
                style={[
                  errors.address && {
                    borderColor: colors.error,
                    borderWidth: 2,
                  },
                ]}
              />
            </View>
            {errors.address && (
              <Text style={styles(colors).editErrorText}>
                {errors.address}
              </Text>
            )}
          </View>

          {/* Dietary Preferences */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>
              Dietary Preferences
            </Text>
            <View style={styles(colors).editPreferencesContainer}>
              {DIETARY_PREFERENCES.map((preference) => (
                <TouchableOpacity
                  key={preference}
                  style={[
                    styles(colors).editPreferenceTag,
                    (editableUser.dietaryPreferences || []).includes(
                      preference
                    ) && styles(colors).editPreferenceTagActive,
                  ]}
                  onPress={() => onToggleDietaryPreference(preference)}
                >
                  <Text
                    style={[
                      styles(colors).editPreferenceTagText,
                      (editableUser.dietaryPreferences || []).includes(
                        preference
                      ) && styles(colors).editPreferenceTagTextActive,
                    ]}
                  >
                    {preference}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Allergies */}
          <View style={styles(colors).editFieldContainer}>
            <Text style={styles(colors).editFieldLabel}>
              Allergies & Restrictions
            </Text>
            <TextInput
              style={[
                styles(colors).editInput,
                styles(colors).editTextArea,
                errors.allergies && styles(colors).editInputError,
              ]}
              value={editableUser.allergies}
              onChangeText={(text) =>
                setEditableUser((prev) => ({ ...prev, allergies: text }))
              }
              placeholder="List any food allergies or restrictions"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />
            {errors.allergies && (
              <Text style={styles(colors).editErrorText}>
                {errors.allergies}
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    // Edit Profile Modal Styles
    editModalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    editHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    editTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    editCancelText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    editSaveText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
    editSaveTextDisabled: {
      color: colors.textMuted,
    },
    editScrollContainer: {
      flex: 1,
    },
    editScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    editFieldContainer: {
      marginBottom: 20,
    },
    editFieldLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 10,
    },
    // Profile Picture Edit Styles
    profilePictureSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profilePictureContainer: {
      position: "relative",
      marginRight: 20,
    },
    profilePictureOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },
    profilePictureInfo: {
      flex: 1,
    },
    profilePictureTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    profilePictureSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    profilePictureHint: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    // Input Styles
    editInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 15,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editInputError: {
      borderColor: colors.error,
    },
    editTextArea: {
      height: 80,
      textAlignVertical: "top",
    },
    autocompleteContainer: {
      minHeight: 50,
      zIndex: 1000,
    },
    editErrorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 5,
    },
    // Preferences Styles
    editPreferencesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    editPreferenceTag: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    editPreferenceTagActive: {
      backgroundColor: `${colors.primary}20`,
      borderColor: `${colors.primary}20`,
    },
    editPreferenceTagText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "500",
    },
    editPreferenceTagTextActive: {
      color: colors.primary,
    },
  });

export default EditProfileModal;
