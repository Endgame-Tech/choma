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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME } from '../../utils/colors';
import { useTheme } from '../../styles/theme';
import { APP_CONFIG } from '../../utils/constants';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code, 3: New password
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setStep(2);
        Alert.alert('Success', 'Reset code sent to your email address');
      } else {
        Alert.alert('Error', data.message || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Send code error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!resetCode.trim()) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    if (resetCode.length !== 6) {
      Alert.alert('Error', 'Reset code must be 6 digits');
      return;
    }

    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          resetCode: resetCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success',
          'Password reset successfully. You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <View style={styles(colors).logoContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles(colors).logoBackground}
        >
          <Ionicons name="lock-closed" size={40} color={colors.white} />
        </LinearGradient>
        <Text style={styles(colors).title}>Forgot Password</Text>
        <Text style={styles(colors).subtitle}>
          Enter your email address and we'll send you a reset code
        </Text>
      </View>

      <View style={styles(colors).form}>
        <View style={styles(colors).inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={colors.textMuted}
            style={styles(colors).inputIcon}
          />
          <TextInput
            style={styles(colors).input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles(colors).actionButton,
            isLoading && styles(colors).actionButtonDisabled,
          ]}
          onPress={handleSendCode}
          disabled={isLoading}
        >
          <LinearGradient
            colors={
              isLoading
                ? [colors.textMuted, colors.textMuted]
                : [colors.primary, colors.primaryDark]
            }
            style={styles(colors).buttonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles(colors).actionButtonText}>Send Reset Code</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles(colors).logoContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles(colors).logoBackground}
        >
          <Ionicons name="mail" size={40} color={colors.white} />
        </LinearGradient>
        <Text style={styles(colors).title}>Enter Reset Code</Text>
        <Text style={styles(colors).subtitle}>
          We've sent a 6-digit code to {email}
        </Text>
      </View>

      <View style={styles(colors).form}>
        <View style={styles(colors).inputContainer}>
          <Ionicons
            name="key-outline"
            size={20}
            color={colors.textMuted}
            style={styles(colors).inputIcon}
          />
          <TextInput
            style={styles(colors).input}
            placeholder="Enter 6-digit code"
            placeholderTextColor={colors.textMuted}
            value={resetCode}
            onChangeText={setResetCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={handleVerifyCode}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles(colors).buttonGradient}
          >
            <Text style={styles(colors).actionButtonText}>Verify Code</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).linkButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles(colors).linkButtonText}>Change email address</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <View style={styles(colors).logoContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles(colors).logoBackground}
        >
          <Ionicons name="create-outline" size={40} color={colors.white} />
        </LinearGradient>
        <Text style={styles(colors).title}>Create New Password</Text>
        <Text style={styles(colors).subtitle}>
          Enter your new password
        </Text>
      </View>

      <View style={styles(colors).form}>
        <View style={styles(colors).inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={colors.textMuted}
            style={styles(colors).inputIcon}
          />
          <TextInput
            style={styles(colors).input}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles(colors).eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles(colors).inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={colors.textMuted}
            style={styles(colors).inputIcon}
          />
          <TextInput
            style={styles(colors).input}
            placeholder="Confirm new password"
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
              name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles(colors).actionButton,
            isLoading && styles(colors).actionButtonDisabled,
          ]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          <LinearGradient
            colors={
              isLoading
                ? [colors.textMuted, colors.textMuted]
                : [colors.primary, colors.primaryDark]
            }
            style={styles(colors).buttonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles(colors).actionButtonText}>Reset Password</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
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
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles(colors).content}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <View style={styles(colors).footer}>
              <Text style={styles(colors).footerText}>
                Remember your password?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles(colors).signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
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
    },
    backButton: {
      padding: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoBackground: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
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
    actionButton: {
      borderRadius: THEME.borderRadius.medium,
      overflow: 'hidden',
      marginTop: 20,
    },
    buttonGradient: {
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: '600',
    },
    linkButton: {
      marginTop: 16,
      alignItems: 'center',
    },
    linkButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 30,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    signInLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default ForgotPasswordScreen;