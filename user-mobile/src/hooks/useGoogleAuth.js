import { useState, useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "../../firebase.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Complete auth session on mount - required for OAuth
WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId:
      "947042824831-l01c22rk5qdhesg0na6u7akd66762ofg.apps.googleusercontent.com", // Web client ID (must be primary)
    androidClientId:
      "947042824831-l9eshtft2ig88h2ua06fj378erdkmvsd.apps.googleusercontent.com", // Android client ID
    // Force web-based OAuth flow through Firebase
    redirectUri: undefined, // Let expo-auth-session use default web handler
  });

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
      setLoading(true);
      try {
        console.log("🎉 OAuth success response:", response);

        const { id_token } = response.params;

        if (!id_token) {
          throw new Error("Missing ID token");
        }

        // Create Firebase credential using the ID token
        const credential = GoogleAuthProvider.credential(id_token);

        const result = await signInWithCredential(firebaseAuth, credential);
        const user = result.user;

        // Store user token
        await AsyncStorage.setItem(
          "userToken",
          user.accessToken || "google_signed_in"
        );

        // Set user info
        const userDetails = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          accessToken: user.accessToken,
        };

        setUserInfo(userDetails);

        console.log("✅ Google Sign-In successful:", userDetails.displayName);
        return { success: true, user: userDetails };
      } catch (error) {
        console.error("❌ Google Sign-In Error:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    }

    if (response?.type === "cancel") {
      console.log("🚫 Google Sign-In cancelled");
      setLoading(false);
      return { success: false, cancelled: true };
    }

    if (response?.type === "error") {
      console.error("🚨 OAuth error:", response.error);
      setLoading(false);
      return {
        success: false,
        error: response.error?.message || "OAuth error",
      };
    }

    return null;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      console.log("🔘 Starting Google Sign-In...");
      console.log("🔘 Request config:", {
        clientId: request?.clientId,
        scopes: request?.scopes,
        redirectUri: request?.redirectUri,
        codeChallenge: request?.codeChallenge ? "✅ Present" : "❌ Missing",
      });

      if (!request) {
        console.error("❌ Request not ready yet");
        setLoading(false);
        return { success: false, error: "Request not ready" };
      }

      console.log("🚀 Calling promptAsync...");
      const result = await promptAsync();
      console.log("📱 promptAsync result:", result);

      return result;
    } catch (error) {
      console.error("❌ Error initiating Google Sign-In:", error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseAuth.signOut();
      await AsyncStorage.removeItem("userToken");
      setUserInfo(null);
      console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
    }
  };

  return {
    userInfo,
    loading,
    signInWithGoogle,
    signOut,
    isSignedIn: !!userInfo,
  };
};
