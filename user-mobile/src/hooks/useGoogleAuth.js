import { useState, useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "../../firebase.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useGoogleAuth = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId:
      "947042824831-16c0m28m40bf5kafcpam3lefe92270mv.apps.googleusercontent.com", // Only Android client for development builds
  });

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
      setLoading(true);
      try {
        const { id_token } = response.params;
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
      return { success: false, cancelled: true };
    }

    return null;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      console.log("🔘 Calling promptAsync...");
      console.log("🔘 promptAsync result:", promptAsync);
      console.log("🔘 request:", request);
      console.log("🔍 OAuth Request Details:", {
        clientId: request?.clientId,
        scopes: request?.scopes,
        redirectUri: request?.redirectUri,
      });
      const result = await promptAsync();
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
