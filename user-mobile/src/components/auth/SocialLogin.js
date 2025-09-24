import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Configure Google Sign-In - for React Native, we should use the web client ID
// but ensure it matches the web client from Firebase Console
GoogleSignin.configure({
  webClientId: "947042824831-dqueq2b81i426nj5t0f52p38nuo8j415.apps.googleusercontent.com",
});

const SocialLogin = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const { socialLogin } = useAuth();
  const { showError } = useAlert();

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);

      console.log("🔥 Starting Google Sign-In...");
      console.log("🔧 Current Google Sign-In configuration:", {
        webClientId: "947042824831-dqueq2b81i426nj5t0f52p38nuo8j415.apps.googleusercontent.com",
        offlineAccess: false,
        scopes: ["openid", "profile", "email"]
      });

      // Check current user first
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        console.log("👤 Current user:", currentUser);
      } catch (getCurrentUserError) {
        console.log("ℹ️ No current user signed in");
      }

      // Clear any previous Google Sign-In session to ensure account chooser shows
      try {
        await GoogleSignin.signOut();
        console.log("✅ Cleared previous Google session");
      } catch (signOutError) {
        console.log("ℹ️ No previous Google session to clear");
      }

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log("✅ Google Play Services available");

      // Sign in with Google to get the ID token
      const signInResult = await GoogleSignin.signIn();
      console.log("✅ Google Sign-In successful, result:", {
        hasUser: !!signInResult.user,
        hasIdToken: !!signInResult.idToken,
        userEmail: signInResult.user?.email,
        idTokenPreview: signInResult.idToken
          ? signInResult.idToken.substring(0, 50) + "..."
          : "null",
      });

      const { idToken } = signInResult;

      // Check if we have a valid ID token
      if (!idToken) {
        throw new Error(
          "No ID token received from Google Sign-In. This usually means the Google Sign-In configuration is incorrect."
        );
      }

      // Skip Firebase Auth and go directly to backend with Google ID token
      console.log(
        "🔥 Skipping Firebase Auth, calling backend directly with Google ID token"
      );

      // Decode the ID token to get user info (basic JWT decode)
      const base64Url = idToken.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      const googleUser = JSON.parse(jsonPayload);
      console.log("✅ Decoded Google user from ID token:", {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        sub: googleUser.sub,
      });

      // Call your backend social login with Google user data
      const result = await socialLogin("google", {
        uid: googleUser.sub, // Google's unique user ID
        email: googleUser.email,
        displayName: googleUser.name,
        photoURL: googleUser.picture,
        idToken: idToken,
      });

      if (!result.success) {
        console.error("❌ Backend social login failed:", result.message);
        showError("Google Login Failed", result.message);

        // Clean up Google Sign-In if backend fails
        await GoogleSignin.signOut();
      } else {
        console.log("✅ Complete Google login successful");
      }
    } catch (error) {
      console.error("❌ Google login error:", error);

      let errorMessage = "Something went wrong. Please try again.";

      // Safe error code checking
      const errorCode = error?.code || error?.message || "";

      if (errorCode === "auth/account-exists-with-different-credential") {
        errorMessage =
          "An account already exists with the same email address but different sign-in credentials.";
      } else if (errorCode === "auth/invalid-credential") {
        errorMessage = "The credential received is malformed or has expired.";
      } else if (errorCode === "auth/operation-not-allowed") {
        errorMessage = "Google sign-in is not enabled for this project.";
      } else if (errorCode === "auth/user-disabled") {
        errorMessage =
          "The user account has been disabled by an administrator.";
      } else if (errorCode === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (errorCode === "7" || errorCode.includes("NETWORK_ERROR")) {
        errorMessage =
          "Network error or Google Play Services issue. Please try again.";
      } else if (
        error?.message?.includes("timeout") ||
        error?.message?.includes("Firebase auth timeout")
      ) {
        errorMessage =
          "Firebase timeout: Google Sign-In is not enabled in Firebase Console. Enable it at console.firebase.google.com";
      }

      showError("Google Login Failed", errorMessage);

      // Clean up on error
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.log("ℹ️ Google sign out cleanup failed:", signOutError);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsFacebookLoading(true);
      showError("Facebook Login", "Facebook login is not configured yet");
    } catch (error) {
      console.error("Facebook login error:", error);
      showError("Facebook Login Failed", "Unable to start Facebook login");
    } finally {
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
              <Ionicons
                name="logo-google"
                size={20}
                color="#fff"
                style={styles.socialIcon}
              />
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
              <Ionicons
                name="logo-facebook"
                size={20}
                color="#fff"
                style={styles.socialIcon}
              />
              <Text
                style={[styles.socialButtonText, styles.facebookButtonText]}
              >
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
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8e8e8",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 14,
    fontWeight: "400",
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButton: {
    backgroundColor: "#4285F4",
  },
  facebookButton: {
    backgroundColor: "#1877F2",
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  googleButtonText: {
    color: "#fff",
  },
  facebookButtonText: {
    color: "#fff",
  },
});

export default SocialLogin;
