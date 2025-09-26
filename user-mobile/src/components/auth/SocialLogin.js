import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAlert } from "../../contexts/AlertContext";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const SocialLogin = () => {
  const { signInWithGoogle, loading } = useGoogleAuth();
  const { showAlert } = useAlert();

  const handleGoogleSignIn = async () => {
    console.log('🔘 Google Sign-In button pressed');
    try {
      console.log('🔘 Calling signInWithGoogle...');
      const result = await signInWithGoogle();
      console.log('🔘 signInWithGoogle result:', result);

      if (result?.success) {
        console.log('✅ Google Sign-In successful');
        showAlert('Success', 'Signed in successfully!', 'success');
      } else if (result?.cancelled) {
        console.log('🚫 Google Sign-In cancelled');
        showAlert('Info', 'Sign in was cancelled', 'info');
      } else if (result?.error) {
        console.log('❌ Google Sign-In error:', result.error);
        showAlert('Error', result.error, 'error');
      }
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error);
      showAlert('Error', 'Failed to sign in with Google. Please try again.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="logo-google" size={24} color="#fff" />
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = createStylesWithDMSans(() =>
  StyleSheet.create({
    container: {
      marginVertical: 20,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4285F4',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginVertical: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
  })
);

export default SocialLogin;
