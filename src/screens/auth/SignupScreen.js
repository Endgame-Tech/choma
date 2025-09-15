// src/screens/auth/SignupScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Modal,
  Dimensions,
  Switch,
  ImageBackground,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import ChomaLogo from "../../components/ui/ChomaLogo";
import CustomDatePicker from "../../components/ui/CustomDatePicker";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import {
  TERMS_AND_CONDITIONS,
  PRIVACY_POLICY_SUMMARY,
} from "../../utils/termsAndConditions";
import CloudStorageService from "../../services/cloudStorage";
import { useAlert } from "../../contexts/AlertContext";
import apiService from "../../services/api";

const { width, height } = Dimensions.get("window");

const SignupScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showInfo, showConfirm, showAlert } =
    useAlert();

  // Get verified email from route params if coming from email verification
  const { verifiedEmail, verificationToken } = route.params || {};

  // Basic info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState(verifiedEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Address info
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [addressCoordinates, setAddressCoordinates] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Profile image
  const [profileImage, setProfileImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Terms and conditions
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Multi-step form
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Animation for smooth keyboard transitions
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [topSectionOffset] = useState(new Animated.Value(0));

  // Rotation animation for the food image (slow spin)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const { signup } = useAuth();

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000, // 20 seconds per full rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [rotateAnim]);

  // Smooth keyboard animation listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        // White form section - move up more (original amount)
        Animated.timing(keyboardOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: -event.endCoordinates.height * 0.3, // Keep white form moving up by 30%
          useNativeDriver: false,
        }).start();

        // Top section (logo + food image) - move up less
        Animated.timing(topSectionOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: -event.endCoordinates.height * 0.1, // Logo and food image move up only 10%
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Reset both animations
        Animated.timing(keyboardOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: 0,
          useNativeDriver: false,
        }).start();

        Animated.timing(topSectionOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardOffset, topSectionOffset]);

  // Format date for display and storage
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForStorage = (date) => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  // Handle date picker
  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateConfirm = (date) => {
    setSelectedDate(date);
    setDateOfBirth(formatDateForStorage(date));
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = (addressInfo) => {
    setDeliveryAddress(addressInfo.formattedAddress);
    setCity(addressInfo.locality || addressInfo.adminArea || "");
    setState(addressInfo.adminArea || "Lagos"); // Default to Lagos if not found
    setAddressCoordinates(addressInfo.coordinates);
  };

  const validateStep1 = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !dateOfBirth.trim() ||
      !email.trim() ||
      !phoneNumber.trim()
    ) {
      showError("Error", "Please fill in all required fields");
      return false;
    }

    if (!email.includes("@")) {
      showError("Error", "Please enter a valid email address");
      return false;
    }

    if (phoneNumber.length < 10) {
      showError("Error", "Please enter a valid phone number");
      return false;
    }

    // Check if user is at least 13 years old
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      age < 13 ||
      (age === 13 && monthDiff < 0) ||
      (age === 13 && monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      showError(
        "Error",
        "You must be at least 13 years old to create an account"
      );
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!password.trim()) {
      showError("Error", "Please enter a password");
      return false;
    }

    if (password.length < 6) {
      showError("Error", "Password must be at least 6 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      showError("Error", "Passwords do not match");
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (!deliveryAddress.trim() || !city.trim() || !state.trim()) {
      showError("Error", "Please fill in all address fields");
      return false;
    }

    if (!acceptedTerms) {
      showError("Error", "Please accept the terms and conditions");
      return false;
    }

    return true;
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showError(
          "Permission Required",
          "Please grant location permission to use current location."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Use our backend's Google Maps API for better address parsing
      try {
        const response = await apiService.reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );

        console.log(
          "🔍 Reverse geocoding response:",
          JSON.stringify(response, null, 2)
        );

        if (
          response.success &&
          response.data &&
          response.data.success &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          const result = response.data.data[0];
          const addressComponents = result.address_components || [];

          console.log(
            "📍 Address components:",
            JSON.stringify(addressComponents, null, 2)
          );

          // Parse address components
          let streetNumber = "";
          let streetName = "";
          let neighborhood = "";
          let city = "";
          let state = "";

          addressComponents.forEach((component) => {
            const types = component.types;
            if (types.includes("street_number")) {
              streetNumber = component.long_name;
            } else if (types.includes("route")) {
              streetName = component.long_name;
            } else if (
              types.includes("sublocality") ||
              types.includes("neighborhood")
            ) {
              neighborhood = component.long_name;
            } else if (types.includes("locality")) {
              // Prioritize locality (actual city name) over administrative areas
              city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              state = component.long_name;
            }
          });

          // Build formatted address
          const addressParts = [streetNumber, streetName, neighborhood].filter(
            Boolean
          );
          const formattedAddress = addressParts.join(" ");

          console.log("🏠 Parsed address parts:", {
            streetNumber,
            streetName,
            neighborhood,
            city,
            state,
            formattedAddress,
          });

          // Set the address fields
          setDeliveryAddress(formattedAddress || result.formatted_address);
          setCity(city || "Lagos"); // Default to Lagos if not found
          setState(state || "Lagos"); // Default to Lagos state if not found

          console.log("✅ Setting address fields:", {
            deliveryAddress: formattedAddress || result.formatted_address,
            city: city || "Lagos",
            state: state || "Lagos",
          });

          // Store coordinates for later use
          setAddressCoordinates({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } else {
          // Fallback to Expo's reverse geocoding
          const addressResponse = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addressResponse.length > 0) {
            const address = addressResponse[0];
            const formattedAddress = [
              address.streetNumber,
              address.street,
              address.district,
            ]
              .filter(Boolean)
              .join(", ");

            setDeliveryAddress(formattedAddress);
            setCity(address.city || address.subregion || "Lagos");
            setState(address.region || address.country || "Lagos");

            setAddressCoordinates({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          } else {
            showError("Error", "Unable to get address from current location");
          }
        }
      } catch (apiError) {
        console.error("Backend geocoding failed, using fallback:", apiError);

        // Fallback to Expo's reverse geocoding
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const address = addressResponse[0];
          const formattedAddress = [
            address.streetNumber,
            address.street,
            address.district,
          ]
            .filter(Boolean)
            .join(", ");

          setDeliveryAddress(formattedAddress);
          setCity(address.city || address.subregion || "Lagos");
          setState(address.region || address.country || "Lagos");

          setAddressCoordinates({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } else {
          showError("Error", "Unable to get address from current location");
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
      showError("Location Error", "Unable to get current location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (source) => {
    try {
      setImageUploading(true);
      let result;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showError("Permission Required", "Please grant camera permission");
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showError(
            "Permission Required",
            "Please grant photo library permission"
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled) {
        setProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showError("Error", "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  const showImagePicker = () => {
    const buttons = [
      { text: "Camera", onPress: () => handleImageUpload("camera") },
      { text: "Photo Library", onPress: () => handleImageUpload("gallery") },
      { text: "Cancel", style: "cancel", onPress: () => {} },
    ];

    showAlert({
      title: "Select Profile Image",
      message: "Choose how you would like to add your profile picture",
      buttons,
      type: "info",
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSignup = async () => {
    if (!validateStep3()) return;

    try {
      setIsLoading(true);

      let cloudImageUrl = null;

      // Upload profile image to cloud storage if provided
      if (profileImage?.uri) {
        try {
          console.log("Uploading profile image to cloud storage...");
          cloudImageUrl = await CloudStorageService.uploadImage(
            profileImage.uri,
            email
          );
          console.log("Profile image uploaded successfully:", cloudImageUrl);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          showError(
            "Image Upload Failed",
            "Failed to upload profile image, but registration will continue without it."
          );
        }
      }

      // Prepare user data for verification step
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        dateOfBirth: dateOfBirth.trim(),
        email: email.trim(),
        password,
        phone: phoneNumber.trim(), // Changed from phoneNumber to phone to match backend
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        profileImage: cloudImageUrl,
      };

      // Check if email is already verified first
      console.log("Checking verification status for:", email.trim());

      try {
        const statusResponse = await apiService.checkVerificationStatus(
          email.trim(),
          "customer_registration"
        );

        console.log(
          "Status check response:",
          JSON.stringify(statusResponse, null, 2)
        );

        // Handle nested response structure from API service
        const verificationData =
          statusResponse?.data?.data || statusResponse?.data;

        if (
          statusResponse &&
          statusResponse.success &&
          verificationData?.verified
        ) {
          console.log(
            "Email already verified, proceeding directly to complete registration"
          );
          // showSuccess(
          //   "Email Already Verified",
          //   "Your email is verified. Completing registration..."
          // );

          // Navigate directly to complete signup
          navigation.navigate("CompleteSignup", {
            userData: {
              ...userData,
              emailVerified: true,
              verificationToken: verificationData.token,
            },
          });
          return;
        }

        console.log(
          "Email not verified, sending verification code to:",
          email.trim()
        );

        const verificationResponse = await apiService.sendVerificationCode({
          email: email.trim(),
          purpose: "customer_registration",
        });

        console.log("Verification response:", verificationResponse);

        if (verificationResponse && verificationResponse.success) {
          showSuccess(
            "Verification Email Sent",
            "Please check your email for the verification code"
          );

          // Navigate to email verification screen
          console.log("Navigating to EmailVerification screen");
          navigation.navigate("EmailVerification", {
            email: email.trim(),
            purpose: "customer_registration",
            userData: userData,
          });
        } else {
          console.error("Verification failed:", verificationResponse);

          // TEMPORARY: For development/testing - navigate anyway
          console.log(
            "API failed, but navigating to EmailVerification for testing"
          );
          showError(
            "Development Mode",
            "Email service not available, but proceeding for testing"
          );

          navigation.navigate("EmailVerification", {
            email: email.trim(),
            purpose: "customer_registration",
            userData: userData,
          });

          // Uncomment below for production:
          // showError(
          //   "Verification Error",
          //   verificationResponse?.message || "Failed to send verification email. Please try again."
          // );
        }
      } catch (verificationError) {
        console.error("Verification API call failed:", verificationError);

        // TEMPORARY: For development/testing - navigate anyway
        console.log(
          "API call failed, but navigating to EmailVerification for testing"
        );
        showError(
          "Development Mode",
          "Connection failed, but proceeding for testing"
        );

        navigation.navigate("EmailVerification", {
          email: email.trim(),
          purpose: "customer_registration",
          userData: userData,
        });

        // Uncomment below for production:
        // showError(
        //   "Connection Error",
        //   "Unable to send verification email. Please check your internet connection."
        // );
      }
    } catch (error) {
      console.error("Signup error:", error);
      showError(
        "Registration Error",
        "Something went wrong. Please check your information and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepText,
                currentStep >= step && styles.stepTextActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {/* <Text style={styles.stepTitle}>Personal Information</Text> */}
      {/* <Text style={styles.stepTitle}>Tell us about yourself</Text> */}

      {/* Profile Image Upload */}
      <View style={styles.imageUploadContainer}>
        <TouchableOpacity
          style={styles.imageUploadButton}
          onPress={showImagePicker}
          disabled={imageUploading}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage.uri }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              {imageUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera" size={30} color={colors.textMuted} />
              )}
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.imageUploadText}>
          {profileImage
            ? "Tap to change photo"
            : "Add profile photo (optional)"}
        </Text>
      </View>

      <View style={styles.nameRow}>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="First Name *"
            placeholderTextColor={colors.textMuted}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name *"
            placeholderTextColor={colors.textMuted}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.inputContainer} onPress={openDatePicker}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.input,
            styles.dateText,
            !dateOfBirth && styles.placeholderText,
          ]}
        >
          {dateOfBirth ? formatDateForDisplay(selectedDate) : "Date of Birth *"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <View
        style={[
          styles.inputContainer,
          verifiedEmail && styles.inputContainerVerified,
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={20}
          color={verifiedEmail ? colors.success : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, verifiedEmail && styles.inputVerified]}
          placeholder="Email address *"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!verifiedEmail}
        />
        {verifiedEmail && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.success}
            style={styles.verifiedIcon}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="call-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          placeholderTextColor={colors.textMuted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      {/* <Text style={styles.stepTitle}>Security</Text> */}
      {/* <Text style={styles.stepTitle}>Create a secure password</Text> */}

      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Password *"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password *"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordHints}>
        <Text style={styles.passwordHintText}>
          Password should be at least 6 characters
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      {/* <Text style={styles.stepTitle}>Delivery Address</Text> */}
      <Text style={styles.stepTitle}>Where should we deliver your meals?</Text>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={isGettingLocation}
      >
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={styles.locationButtonText}>
          {isGettingLocation ? "Getting location..." : "Use current location"}
        </Text>
        {isGettingLocation && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </TouchableOpacity>

      <View style={styles.autocompleteContainer}>
        <AddressAutocomplete
          placeholder="Search for delivery address *"
          onAddressSelect={handleAddressSelect}
          defaultValue={deliveryAddress}
        />
      </View>

      <View style={styles.addressRow}>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="business-outline"
            size={20}
            color={colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="City *"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="map-outline"
            size={20}
            color={colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="State *"
            placeholderTextColor={colors.textMuted}
            value={state}
            onChangeText={setState}
          />
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <View style={styles.termsRow}>
          <Switch
            value={acceptedTerms}
            onValueChange={setAcceptedTerms}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={acceptedTerms ? colors.white : colors.textMuted}
          />
          <View style={styles.termsTextContainer}>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                style={styles.termsLink}
                onPress={() => setShowTermsModal(true)}
              >
                Terms and Conditions
              </Text>{" "}
              and{" "}
              <Text
                style={styles.termsLink}
                onPress={() => setShowTermsModal(true)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTermsModal = () => (
    <Modal
      visible={showTermsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTermsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <Text style={styles.termsContent}>{TERMS_AND_CONDITIONS}</Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => {
                setAcceptedTerms(true);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#652815" />

      {/* Background with brown color and pattern */}
      <View style={styles.backgroundContainer}>
        <ImageBackground
          source={require("../../../assets/patternchoma.png")}
          style={styles.backgroundPattern}
          resizeMode="repeat"
          imageStyle={styles.backgroundImageStyle}
        />

        {/* Top section with logo and food image */}
        <Animated.View
          style={[
            styles.topSection,
            { transform: [{ translateY: topSectionOffset }] },
          ]}
        >
          <View style={styles.logoContainer}>
            <ChomaLogo width={150} height={82} />
          </View>

          {/* Food Image (slow rotating) */}
          <View style={styles.foodImageContainer}>
            <Animated.Image
              source={require("../../../assets/authImage.png")}
              style={[
                styles.foodImage,
                { transform: [{ rotate: rotateInterpolate }] },
              ]}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Bottom white section with form */}
        <Animated.View
          style={[
            styles.bottomSection,
            { transform: [{ translateY: keyboardOffset }] },
          ]}
        >
          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            enableOnAndroid={true}
            keyboardDismissMode="interactive"
          >
            {/* Welcome text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Create Account</Text>
              <Text style={styles.welcomeSubtitle}>
                Start Your healthy journey with Choma
              </Text>
            </View>

            {/* Step info */}
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>
                {currentStep === 1
                  ? "Tell us about yourself"
                  : currentStep === 2
                  ? "Create a secure password"
                  : "Where should we deliver your meals?"}
              </Text>
              {renderStepIndicator()}
            </View>

            {/* Form content based on current step */}
            <View style={styles.form}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <View style={styles.buttonContainer}>
                {currentStep < 3 ? (
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.signupButton,
                      isLoading && styles.signupButtonDisabled,
                    ]}
                    onPress={handleSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.signupButtonText}>
                        Finish Sign Up
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Add some bottom padding for better scrolling */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>

      {renderTermsModal()}

      <CustomDatePicker
        visible={showDatePicker}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        initialDate={selectedDate}
        minimumAge={13}
        title="Select Date of Birth"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#652815",
  },
  backgroundContainer: {
    flex: 1,
    position: "relative",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#652815",
    opacity: 0.8, // Subtle pattern overlay
  },
  backgroundImageStyle: {
    opacity: 1,
    transform: [{ scale: 2.5 }], // Makes the pattern 2x bigger
  },
  topSection: {
    flex: 0.4,
    paddingTop: Platform.OS === "ios" ? 30 : 70,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    marginTop: -30,
    marginBottom: 20,
  },
  foodImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  foodImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  bottomSection: {
    flex: 0.8,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    minHeight: height * 0.5,
    zIndex: 3,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 70,
    paddingTop: 20,
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  stepInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#e8e8e8",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#652815",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  stepTextActive: {
    color: "#fff",
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: "#e8e8e8",
    marginHorizontal: 10,
  },
  stepLineActive: {
    backgroundColor: "#652815",
  },

  form: {
    width: "100%",
  },

  // Step content
  stepContent: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 25,
    marginBottom: 16,
    paddingHorizontal: 20,
    height: 50,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  inputContainerVerified: {
    backgroundColor: "#4CAF50" + "10",
    borderColor: "#4CAF50",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  inputVerified: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  eyeIcon: {
    padding: 4,
  },

  // Date picker styles
  dateText: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  placeholderText: {
    color: "#999",
  },
  // Address fields
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },

  // Profile image upload
  imageUploadContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  imageUploadButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#F4D03F",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F4D03F",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
  },
  imageUploadText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  // Location button
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E6B17A",
  },
  locationButtonText: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  // Password hints
  passwordHints: {
    marginTop: 10,
  },
  passwordHintText: {
    fontSize: 12,
    color: "#666",
  },

  // Terms and conditions
  termsContainer: {
    marginTop: 20,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  termsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  termsLink: {
    color: "#E6B17A",
    textDecorationLine: "underline",
  },

  // Buttons
  buttonContainer: {
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: "#652815",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#652815",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupButton: {
    backgroundColor: "#652815",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#652815",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  loginLink: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 30,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  termsContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
  },
  acceptButton: {
    backgroundColor: "#E6B17A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Address autocomplete styles
  autocompleteContainer: {
    marginBottom: 16,
    zIndex: 1000,
    minHeight: 50,
  },
});

export default SignupScreen;
