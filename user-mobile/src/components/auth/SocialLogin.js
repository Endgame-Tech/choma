import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { createStylesWithDMSans } from '../../utils/fontUtils';

WebBrowser.maybeCompleteAuthSession();

const SocialLogin = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const { socialLogin } = useAuth();
  const { showError } = useAlert();

  // Google OAuth Configuration
  const googleDiscovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id',
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'choma',
        path: undefined,
      }),
    },
    googleDiscovery
  );

  // Facebook OAuth Configuration
  const facebookDiscovery = AuthSession.useAutoDiscovery('https://www.facebook.com');

  const [facebookRequest, facebookResponse, facebookPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || 'your-facebook-app-id',
      scopes: ['public_profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'choma',
        path: undefined,
      }),
    },
    facebookDiscovery
  );

  // Handle Google OAuth response
  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleSuccess(googleResponse);
    }
  }, [googleResponse]);

  // Handle Facebook OAuth response
  React.useEffect(() => {
    if (facebookResponse?.type === 'success') {
      handleFacebookSuccess(facebookResponse);
    }
  }, [facebookResponse]);

  const handleGoogleSuccess = async (response) => {
    try {
      setIsGoogleLoading(true);

      const { access_token, id_token } = response.params;

      const result = await socialLogin('google', {
        accessToken: access_token,
        idToken: id_token,
      });

      if (!result.success) {
        showError('Google Login Failed', result.message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      showError('Google Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookSuccess = async (response) => {
    try {
      setIsFacebookLoading(true);

      const { access_token } = response.params;

      const result = await socialLogin('facebook', {
        accessToken: access_token,
      });

      if (!result.success) {
        showError('Facebook Login Failed', result.message);
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      showError('Facebook Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (!googleRequest) {
        showError('Google Login', 'Google login is not configured properly');
        return;
      }
      setIsGoogleLoading(true);
      await googlePromptAsync();
    } catch (error) {
      console.error('Google login initiation error:', error);
      showError('Google Login Failed', 'Unable to start Google login');
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      if (!facebookRequest) {
        showError('Facebook Login', 'Facebook login is not configured properly');
        return;
      }
      setIsFacebookLoading(true);
      await facebookPromptAsync();
    } catch (error) {
      console.error('Facebook login initiation error:', error);
      showError('Facebook Login Failed', 'Unable to start Facebook login');
      setIsFacebookLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Login Buttons */}
      <View style={styles.socialButtonsContainer}>
        {/* Google Login Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading || isFacebookLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, styles.googleButtonText]}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Facebook Login Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebookLogin}
          disabled={isGoogleLoading || isFacebookLoading}
        >
          {isFacebookLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="logo-facebook" size={20} color="#fff" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                Continue with Facebook
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    marginTop: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  googleButtonText: {
    color: '#fff',
  },
  facebookButtonText: {
    color: '#fff',
  },
});

export default SocialLogin;