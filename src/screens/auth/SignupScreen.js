// src/screens/auth/SignupScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Modal,
  Dimensions,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY_SUMMARY } from '../../utils/termsAndConditions';
import CloudStorageService from '../../services/cloudStorage';

const SignupScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  
  // Basic info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Address info
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
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
  
  const { signup } = useAuth();

  const validateStep1 = () => {
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const validateStep3 = () => {
    if (!deliveryAddress.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Error', 'Please fill in all address fields');
      return false;
    }
    
    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return false;
    }
    
    return true;
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant location permission to use current location.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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
        ].filter(Boolean).join(', ');

        setDeliveryAddress(formattedAddress);
        setCity(address.city || '');
        setState(address.region || '');
        
        Alert.alert('Location Found', 'Current location set as delivery address');
      } else {
        Alert.alert('Error', 'Unable to get address from current location');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get current location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (source) => {
    try {
      setImageUploading(true);
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera permission');
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant photo library permission');
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
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Profile Image',
      'Choose how you would like to add your profile picture',
      [
        { text: 'Camera', onPress: () => handleImageUpload('camera') },
        { text: 'Photo Library', onPress: () => handleImageUpload('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
          console.log('Uploading profile image to cloud storage...');
          // For development, we'll use mock upload
          // In production, use: cloudImageUrl = await CloudStorageService.uploadImage(profileImage.uri, email);
          cloudImageUrl = await CloudStorageService.mockUpload(profileImage.uri, email);
          console.log('Profile image uploaded successfully:', cloudImageUrl);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert(
            'Image Upload Failed',
            'Failed to upload profile image, but account creation will continue without it.',
            [{ text: 'Continue', onPress: () => {} }]
          );
        }
      }
      
      const userData = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        profileImage: cloudImageUrl,
      };
      
      const result = await signup(userData);
      
      if (result.success) {
        Alert.alert('Success', result.message || 'Account created successfully!');
      } else {
        Alert.alert('Registration Failed', result.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles(colors).stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles(colors).stepContainer}>
          <View style={[
            styles(colors).stepCircle,
            currentStep >= step && styles(colors).stepCircleActive
          ]}>
            <Text style={[
              styles(colors).stepText,
              currentStep >= step && styles(colors).stepTextActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles(colors).stepLine,
              currentStep > step && styles(colors).stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles(colors).stepContent}>
      <Text style={styles(colors).stepTitle}>Personal Information</Text>
      <Text style={styles(colors).stepSubtitle}>Tell us about yourself</Text>

      {/* Profile Image Upload */}
      <View style={styles(colors).imageUploadContainer}>
        <TouchableOpacity 
          style={styles(colors).imageUploadButton}
          onPress={showImagePicker}
          disabled={imageUploading}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage.uri }} style={styles(colors).profileImage} />
          ) : (
            <View style={styles(colors).placeholderImage}>
              {imageUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera" size={30} color={colors.textMuted} />
              )}
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles(colors).imageUploadText}>
          {profileImage ? 'Tap to change photo' : 'Add profile photo (optional)'}
        </Text>
      </View>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
          placeholder="Full Name *"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
          placeholder="Email address *"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="call-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
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
    <View style={styles(colors).stepContent}>
      <Text style={styles(colors).stepTitle}>Security</Text>
      <Text style={styles(colors).stepSubtitle}>Create a secure password</Text>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
          placeholder="Password *"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles(colors).eyeIcon}
        >
          <Ionicons 
            name={showPassword ? "eye-outline" : "eye-off-outline"} 
            size={20} 
            color={colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
          placeholder="Confirm Password *"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles(colors).eyeIcon}
        >
          <Ionicons 
            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
            size={20} 
            color={colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles(colors).passwordHints}>
        <Text style={styles(colors).passwordHintText}>Password should be at least 6 characters</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles(colors).stepContent}>
      <Text style={styles(colors).stepTitle}>Delivery Address</Text>
      <Text style={styles(colors).stepSubtitle}>Where should we deliver your meals?</Text>

      <TouchableOpacity 
        style={styles(colors).locationButton}
        onPress={getCurrentLocation}
        disabled={isGettingLocation}
      >
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={styles(colors).locationButtonText}>
          {isGettingLocation ? 'Getting location...' : 'Use current location'}
        </Text>
        {isGettingLocation && <ActivityIndicator size="small" color={colors.primary} />}
      </TouchableOpacity>

      <View style={styles(colors).inputContainer}>
        <Ionicons name="home-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
        <TextInput
          style={styles(colors).input}
          placeholder="Delivery Address *"
          placeholderTextColor={colors.textMuted}
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
        />
      </View>

      <View style={styles(colors).addressRow}>
        <View style={[styles(colors).inputContainer, styles(colors).halfWidth]}>
          <Ionicons name="business-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
          <TextInput
            style={styles(colors).input}
            placeholder="City *"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={[styles(colors).inputContainer, styles(colors).halfWidth]}>
          <Ionicons name="map-outline" size={20} color={colors.textMuted} style={styles(colors).inputIcon} />
          <TextInput
            style={styles(colors).input}
            placeholder="State *"
            placeholderTextColor={colors.textMuted}
            value={state}
            onChangeText={setState}
          />
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles(colors).termsContainer}>
        <View style={styles(colors).termsRow}>
          <Switch
            value={acceptedTerms}
            onValueChange={setAcceptedTerms}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={acceptedTerms ? colors.white : colors.textMuted}
          />
          <View style={styles(colors).termsTextContainer}>
            <Text style={styles(colors).termsText}>
              I agree to the{' '}
              <Text 
                style={styles(colors).termsLink}
                onPress={() => setShowTermsModal(true)}
              >
                Terms and Conditions
              </Text>
              {' '}and{' '}
              <Text 
                style={styles(colors).termsLink}
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
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).modalContent}>
          <View style={styles(colors).modalHeader}>
            <Text style={styles(colors).modalTitle}>Terms and Conditions</Text>
            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              style={styles(colors).modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles(colors).modalScroll}>
            <Text style={styles(colors).termsContent}>
              {TERMS_AND_CONDITIONS}
            </Text>
          </ScrollView>
          
          <View style={styles(colors).modalFooter}>
            <TouchableOpacity
              style={styles(colors).acceptButton}
              onPress={() => {
                setAcceptedTerms(true);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles(colors).acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <KeyboardAvoidingView 
        style={styles(colors).container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles(colors).scrollContainer}>
          <View style={styles(colors).header}>
            <TouchableOpacity 
              style={styles(colors).backButton}
              onPress={() => {
                if (currentStep > 1) {
                  handlePrevStep();
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If no screen to go back to, navigate to welcome screen
                  navigation.navigate('Welcome');
                }
              }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles(colors).headerTitle}>
              {currentStep === 1 ? 'Personal Info' : currentStep === 2 ? 'Security' : 'Address & Terms'}
            </Text>
            <View style={styles(colors).headerSpacer} />
          </View>

          {renderStepIndicator()}

          <View style={styles(colors).content}>
            <View style={styles(colors).logoContainer}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles(colors).logoBackground}
              >
                <Ionicons name="person-add" size={40} color={colors.white} />
              </LinearGradient>
              <Text style={styles(colors).title}>Create Account</Text>
              <Text style={styles(colors).subtitle}>Start your healthy journey with choma</Text>
            </View>

            <View style={styles(colors).form}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <View style={styles(colors).buttonContainer}>
                {currentStep < 3 ? (
                  <TouchableOpacity 
                    style={styles(colors).nextButton}
                    onPress={handleNextStep}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles(colors).buttonGradient}
                    >
                      <Text style={styles(colors).nextButtonText}>Next</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles(colors).signupButton, isLoading && styles(colors).signupButtonDisabled]}
                    onPress={handleSignup}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? [colors.textMuted, colors.textMuted] : [colors.primary, colors.primaryDark]}
                      style={styles(colors).buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles(colors).signupButtonText}>Create Account</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles(colors).footer}>
              <Text style={styles(colors).footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles(colors).loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderTermsModal()}
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepTextActive: {
    color: colors.white,
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Step content
  stepContent: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 4,
  },
  
  // Address fields
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  
  // Profile image upload
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageUploadButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  imageUploadText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Location button
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  
  // Password hints
  passwordHints: {
    marginTop: 10,
  },
  passwordHintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  
  // Terms and conditions
  termsContainer: {
    marginTop: 20,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  termsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  
  // Buttons
  buttonContainer: {
    marginTop: 20,
  },
  nextButton: {
    borderRadius: THEME.borderRadius.medium,
    overflow: 'hidden',
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  signupButton: {
    borderRadius: THEME.borderRadius.medium,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.text,
    lineHeight: 20,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignupScreen;