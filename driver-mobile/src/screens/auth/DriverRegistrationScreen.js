// src/screens/auth/DriverRegistrationScreen.js - Driver registration with vehicle info
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { useAlert } from "../../contexts/AlertContext";
import CustomText from "../../components/ui/CustomText";
import { VEHICLE_TYPES } from "../../utils/constants";
import driverApiService from "../../services/driverApi";

const DriverRegistrationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { login } = useDriverAuth();

  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    
    // Driver Info
    licenseNumber: "",
    vehicleType: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    plateNumber: "",
    
    // Address
    address: "",
    city: "",
    state: "",
    
    // Agreement
    termsAccepted: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Refs for form inputs
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const steps = [
    { title: "Personal Info", subtitle: "Tell us about yourself" },
    { title: "Driver Details", subtitle: "License and vehicle information" },
    { title: "Address", subtitle: "Where are you located?" },
    { title: "Review", subtitle: "Confirm your information" },
  ];

  // Update form data
  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Personal Info
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
        if (!formData.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Please enter a valid email";
        }
        if (!formData.phone.trim()) {
          newErrors.phone = "Phone number is required";
        } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
          newErrors.phone = "Please enter a valid phone number";
        }
        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        break;

      case 2: // Driver Details
        if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "License number is required";
        if (!formData.vehicleType) newErrors.vehicleType = "Vehicle type is required";
        if (!formData.vehicleMake.trim()) newErrors.vehicleMake = "Vehicle make is required";
        if (!formData.vehicleModel.trim()) newErrors.vehicleModel = "Vehicle model is required";
        if (!formData.vehicleYear.trim()) {
          newErrors.vehicleYear = "Vehicle year is required";
        } else if (!/^\d{4}$/.test(formData.vehicleYear) || parseInt(formData.vehicleYear) < 1990) {
          newErrors.vehicleYear = "Please enter a valid year (1990 or later)";
        }
        if (!formData.plateNumber.trim()) newErrors.plateNumber = "Plate number is required";
        break;

      case 3: // Address
        if (!formData.address.trim()) newErrors.address = "Address is required";
        if (!formData.city.trim()) newErrors.city = "City is required";
        if (!formData.state.trim()) newErrors.state = "State is required";
        break;

      case 4: // Review
        if (!formData.termsAccepted) newErrors.termsAccepted = "You must accept the terms and conditions";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Go to next step
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  // Go to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle registration
  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      // Prepare registration data
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        licenseNumber: formData.licenseNumber,
        vehicle: {
          type: formData.vehicleType,
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          year: parseInt(formData.vehicleYear),
          plateNumber: formData.plateNumber,
        },
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
        },
        termsAccepted: formData.termsAccepted,
      };

      // Call registration API
      const response = await driverApiService.register(registrationData);

      if (response.success) {
        showSuccess("Registration successful! You can now log in.");
        navigation.navigate("Login");
      }
    } catch (error) {
      showError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderDriverDetails();
      case 3:
        return renderAddress();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  // Personal info step
  const renderPersonalInfo = () => (
    <View style={styles(colors).stepContent}>
      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>First Name *</Text>
        <TextInput
          style={[styles(colors).input, errors.firstName && styles(colors).inputError]}
          value={formData.firstName}
          onChangeText={(value) => updateFormData("firstName", value)}
          placeholder="Enter your first name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        {errors.firstName && <Text style={styles(colors).errorText}>{errors.firstName}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Last Name *</Text>
        <TextInput
          style={[styles(colors).input, errors.lastName && styles(colors).inputError]}
          value={formData.lastName}
          onChangeText={(value) => updateFormData("lastName", value)}
          placeholder="Enter your last name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          returnKeyType="next"
        />
        {errors.lastName && <Text style={styles(colors).errorText}>{errors.lastName}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Email *</Text>
        <TextInput
          ref={emailRef}
          style={[styles(colors).input, errors.email && styles(colors).inputError]}
          value={formData.email}
          onChangeText={(value) => updateFormData("email", value.toLowerCase())}
          placeholder="Enter your email address"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        {errors.email && <Text style={styles(colors).errorText}>{errors.email}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Phone Number *</Text>
        <TextInput
          ref={phoneRef}
          style={[styles(colors).input, errors.phone && styles(colors).inputError]}
          value={formData.phone}
          onChangeText={(value) => updateFormData("phone", value)}
          placeholder="Enter your phone number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        {errors.phone && <Text style={styles(colors).errorText}>{errors.phone}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Password *</Text>
        <View style={styles(colors).passwordContainer}>
          <TextInput
            ref={passwordRef}
            style={[styles(colors).passwordInput, errors.password && styles(colors).inputError]}
            value={formData.password}
            onChangeText={(value) => updateFormData("password", value)}
            placeholder="Create a secure password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />
          <TouchableOpacity
            style={styles(colors).eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles(colors).errorText}>{errors.password}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Confirm Password *</Text>
        <View style={styles(colors).passwordContainer}>
          <TextInput
            ref={confirmPasswordRef}
            style={[styles(colors).passwordInput, errors.confirmPassword && styles(colors).inputError]}
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData("confirmPassword", value)}
            placeholder="Confirm your password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showConfirmPassword}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles(colors).eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles(colors).errorText}>{errors.confirmPassword}</Text>}
      </View>
    </View>
  );

  // Driver details step
  const renderDriverDetails = () => (
    <View style={styles(colors).stepContent}>
      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Driver's License Number *</Text>
        <TextInput
          style={[styles(colors).input, errors.licenseNumber && styles(colors).inputError]}
          value={formData.licenseNumber}
          onChangeText={(value) => updateFormData("licenseNumber", value)}
          placeholder="Enter your license number"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
        />
        {errors.licenseNumber && <Text style={styles(colors).errorText}>{errors.licenseNumber}</Text>}
      </View>

      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Vehicle Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles(colors).vehicleTypeContainer}>
          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles(colors).vehicleTypeButton,
                formData.vehicleType === value && styles(colors).vehicleTypeButtonActive
              ]}
              onPress={() => updateFormData("vehicleType", value)}
            >
              <Text style={[
                styles(colors).vehicleTypeText,
                formData.vehicleType === value && styles(colors).vehicleTypeTextActive
              ]}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.vehicleType && <Text style={styles(colors).errorText}>{errors.vehicleType}</Text>}
      </View>

      <View style={styles(colors).row}>
        <View style={[styles(colors).inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles(colors).label}>Make *</Text>
          <TextInput
            style={[styles(colors).input, errors.vehicleMake && styles(colors).inputError]}
            value={formData.vehicleMake}
            onChangeText={(value) => updateFormData("vehicleMake", value)}
            placeholder="Toyota"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
          {errors.vehicleMake && <Text style={styles(colors).errorText}>{errors.vehicleMake}</Text>}
        </View>

        <View style={[styles(colors).inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles(colors).label}>Model *</Text>
          <TextInput
            style={[styles(colors).input, errors.vehicleModel && styles(colors).inputError]}
            value={formData.vehicleModel}
            onChangeText={(value) => updateFormData("vehicleModel", value)}
            placeholder="Corolla"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
          {errors.vehicleModel && <Text style={styles(colors).errorText}>{errors.vehicleModel}</Text>}
        </View>
      </View>

      <View style={styles(colors).row}>
        <View style={[styles(colors).inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles(colors).label}>Year *</Text>
          <TextInput
            style={[styles(colors).input, errors.vehicleYear && styles(colors).inputError]}
            value={formData.vehicleYear}
            onChangeText={(value) => updateFormData("vehicleYear", value)}
            placeholder="2020"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={4}
          />
          {errors.vehicleYear && <Text style={styles(colors).errorText}>{errors.vehicleYear}</Text>}
        </View>

        <View style={[styles(colors).inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles(colors).label}>Plate Number *</Text>
          <TextInput
            style={[styles(colors).input, errors.plateNumber && styles(colors).inputError]}
            value={formData.plateNumber}
            onChangeText={(value) => updateFormData("plateNumber", value)}
            placeholder="ABC 123 XY"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
          {errors.plateNumber && <Text style={styles(colors).errorText}>{errors.plateNumber}</Text>}
        </View>
      </View>
    </View>
  );

  // Address step
  const renderAddress = () => (
    <View style={styles(colors).stepContent}>
      <View style={styles(colors).inputGroup}>
        <Text style={styles(colors).label}>Street Address *</Text>
        <TextInput
          style={[styles(colors).input, errors.address && styles(colors).inputError]}
          value={formData.address}
          onChangeText={(value) => updateFormData("address", value)}
          placeholder="Enter your street address"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          multiline
          numberOfLines={2}
        />
        {errors.address && <Text style={styles(colors).errorText}>{errors.address}</Text>}
      </View>

      <View style={styles(colors).row}>
        <View style={[styles(colors).inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles(colors).label}>City *</Text>
          <TextInput
            style={[styles(colors).input, errors.city && styles(colors).inputError]}
            value={formData.city}
            onChangeText={(value) => updateFormData("city", value)}
            placeholder="Abuja"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
          {errors.city && <Text style={styles(colors).errorText}>{errors.city}</Text>}
        </View>

        <View style={[styles(colors).inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles(colors).label}>State *</Text>
          <TextInput
            style={[styles(colors).input, errors.state && styles(colors).inputError]}
            value={formData.state}
            onChangeText={(value) => updateFormData("state", value)}
            placeholder="FCT"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
          {errors.state && <Text style={styles(colors).errorText}>{errors.state}</Text>}
        </View>
      </View>
    </View>
  );

  // Review step
  const renderReview = () => (
    <View style={styles(colors).stepContent}>
      <CustomText style={styles(colors).reviewTitle}>Review Your Information</CustomText>
      
      <View style={styles(colors).reviewSection}>
        <CustomText style={styles(colors).reviewSectionTitle}>Personal Information</CustomText>
        <CustomText style={styles(colors).reviewItem}>Name: {formData.firstName} {formData.lastName}</CustomText>
        <CustomText style={styles(colors).reviewItem}>Email: {formData.email}</CustomText>
        <CustomText style={styles(colors).reviewItem}>Phone: {formData.phone}</CustomText>
      </View>

      <View style={styles(colors).reviewSection}>
        <CustomText style={styles(colors).reviewSectionTitle}>Driver Information</CustomText>
        <CustomText style={styles(colors).reviewItem}>License: {formData.licenseNumber}</CustomText>
        <CustomText style={styles(colors).reviewItem}>Vehicle: {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}</CustomText>
        <CustomText style={styles(colors).reviewItem}>Type: {formData.vehicleType}</CustomText>
        <CustomText style={styles(colors).reviewItem}>Plate: {formData.plateNumber}</CustomText>
      </View>

      <View style={styles(colors).reviewSection}>
        <CustomText style={styles(colors).reviewSectionTitle}>Address</CustomText>
        <CustomText style={styles(colors).reviewItem}>{formData.address}</CustomText>
        <CustomText style={styles(colors).reviewItem}>{formData.city}, {formData.state}</CustomText>
      </View>

      <TouchableOpacity
        style={styles(colors).checkboxContainer}
        onPress={() => updateFormData("termsAccepted", !formData.termsAccepted)}
      >
        <View style={[styles(colors).checkbox, formData.termsAccepted && styles(colors).checkboxChecked]}>
          {formData.termsAccepted && (
            <Ionicons name="checkmark" size={16} color={colors.white} />
          )}
        </View>
        <CustomText style={styles(colors).checkboxText}>
          I agree to the Terms and Conditions and Privacy Policy
        </CustomText>
      </TouchableOpacity>
      {errors.termsAccepted && <Text style={styles(colors).errorText}>{errors.termsAccepted}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <KeyboardAvoidingView
        style={styles(colors).container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            style={styles(colors).backButton}
            onPress={() => currentStep > 1 ? prevStep() : navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <CustomText style={styles(colors).headerTitle}>Driver Registration</CustomText>
          <View style={styles(colors).headerRight}>
            <CustomText style={styles(colors).stepIndicator}>{currentStep}/4</CustomText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles(colors).progressContainer}>
          <View style={styles(colors).progressBar}>
            <View
              style={[
                styles(colors).progressFill,
                { width: `${(currentStep / 4) * 100}%` }
              ]}
            />
          </View>
        </View>

        {/* Step title */}
        <View style={styles(colors).stepHeader}>
          <CustomText style={styles(colors).stepTitle}>{steps[currentStep - 1].title}</CustomText>
          <CustomText style={styles(colors).stepSubtitle}>{steps[currentStep - 1].subtitle}</CustomText>
        </View>

        {/* Form content */}
        <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles(colors).buttonContainer}>
          <TouchableOpacity
            style={[styles(colors).button, styles(colors).primaryButton]}
            onPress={nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <CustomText style={styles(colors).buttonText}>
                {currentStep === 4 ? "Register" : "Continue"}
              </CustomText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    headerRight: {
      width: 40,
      alignItems: "flex-end",
    },
    stepIndicator: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    stepHeader: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    stepSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    stepContent: {
      paddingBottom: 100,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    inputError: {
      borderColor: colors.error,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    passwordInput: {
      flex: 1,
      height: 48,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
    },
    eyeIcon: {
      padding: 12,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 4,
    },
    vehicleTypeContainer: {
      marginBottom: 8,
    },
    vehicleTypeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.surface,
    },
    vehicleTypeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    vehicleTypeText: {
      fontSize: 14,
      color: colors.text,
    },
    vehicleTypeTextActive: {
      color: colors.white,
    },
    row: {
      flexDirection: "row",
    },
    reviewTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 20,
    },
    reviewSection: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    reviewSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    reviewItem: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 4,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    buttonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
  });

export default DriverRegistrationScreen;