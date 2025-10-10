import { useState } from "react";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "../../firebase.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const { setUser, setIsAuthenticated, setIsLoading } = useAuth();

  const signInWithGoogle = async () => {
    if (loading) {
      console.log("⏳ Google Sign-In already in progress");
      return { success: false, error: "Authentication already in progress" };
    }

    setLoading(true);
    setIsLoading(true);

    try {
      console.log("� Starting Google Sign-In...");

      // Check if Google Play Services is available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { data: userInfo } = response;
        console.log("� Google Sign-In successful, processing tokens...");

        // Get the ID token for Firebase authentication
        const { idToken } = userInfo;

        if (!idToken) {
          throw new Error("No ID token received from Google");
        }

        console.log("🔐 Signing in with Firebase...");

        // Create Firebase credential and sign in
        const firebaseCredential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(
          firebaseAuth,
          firebaseCredential
        );
        const firebaseUser = result.user;

        console.log("✅ Firebase authentication successful");
        console.log("📤 Sending to backend...");

        // Debug: Log what tokens we have
        console.log("🔍 Available tokens:", {
          hasIdToken: !!idToken,
          hasAccessToken: !!userInfo.accessToken,
          idTokenPreview: idToken ? idToken.substring(0, 50) + "..." : "null",
          accessTokenPreview: userInfo.accessToken
            ? userInfo.accessToken.substring(0, 50) + "..."
            : "null",
        });

        // Send to your backend for user creation/login
        const backendResponse = await api.post("/auth/social/google", {
          idToken: idToken || null,
          accessToken: userInfo.accessToken || null,
        });

        // Debug: Log the complete backend response
        console.log("🔍 Backend response:", {
          success: backendResponse.success,
          hasToken: !!backendResponse.token,
          hasCustomer: !!backendResponse.customer,
          keys: Object.keys(backendResponse),
          response: JSON.stringify(backendResponse, null, 2),
        });

        // Handle nested response structure - backend returns data nested in 'data' property
        const responseData = backendResponse.data || backendResponse;

        if (backendResponse.success && responseData.token) {
          // Store your app's auth token using API service (ensures consistency with email/password login)
          const appToken = responseData.token;
          await api.storeToken(appToken); // Use API service's token storage method

          // Store user data - backend returns customer object
          const userData = responseData.customer;
          await AsyncStorage.setItem("userData", JSON.stringify(userData));

          // Cache user data for faster subsequent auth (same as email/password login)
          if (userData) {
            await api.setCachedUser({
              success: true,
              data: { customer: userData },
            });
            console.log("📋 User data cached after Google Sign-In for faster auth");
          }

          const userDetails = {
            ...userData,
            uid: firebaseUser.uid,
            displayName: userData.fullName || firebaseUser.displayName,
            email: userData.email || firebaseUser.email,
            photoURL: userData.profileImage || firebaseUser.photoURL,
          };

          // Update the main AuthContext state
          setUser(userDetails);
          setIsAuthenticated(true);

          console.log(
            "✅ Complete authentication successful:",
            userDetails.displayName
          );

          return {
            success: true,
            user: userDetails,
            token: appToken,
          };
        } else {
          throw new Error(
            responseData.message || "Backend authentication failed"
          );
        }
      } else {
        console.log("🚫 Google Sign-In cancelled by user");
        return { success: false, cancelled: true };
      }
    } catch (error) {
      console.error("❌ Google Sign-In Error:", error);

      let errorMessage = "Authentication failed";

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            errorMessage = "Sign-in was cancelled by user";
            console.log("🚫 Sign-in cancelled by user");
            return { success: false, cancelled: true };
          case statusCodes.IN_PROGRESS:
            errorMessage = "Sign-in operation is already in progress";
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            errorMessage = "Google Play Services is not available or outdated";
            break;
          default:
            errorMessage = error.message || "An unknown error occurred";
        }
      } else {
        errorMessage =
          error.response?.data?.message || error.message || errorMessage;
      }

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();

      // Sign out from Firebase
      await firebaseAuth.signOut();

      // Clear stored data using API service
      await api.removeToken(); // Use API service's token removal method
      await api.clearCachedUser(); // Clear cached user data
      await AsyncStorage.removeItem("userData");

      // Update AuthContext state
      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
    }
  };

  return {
    loading,
    signInWithGoogle,
    signOut,
  };
};
