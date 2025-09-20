// src/utils/networkUtils.js - Network status and error handling utilities
import rateLimitService from "../services/rateLimitService";

export const NetworkUtils = {
  // Parse API error messages to provide user-friendly feedback
  parseApiError: (error, endpoint = "unknown") => {
    if (!error) {
      return {
        type: "error",
        message: "An unknown error occurred",
        userMessage: "Something went wrong. Please try again.",
      };
    }

    const errorMessage = error.message || error.toString();

    // Rate limiting errors
    if (
      errorMessage.includes("Rate limited") ||
      errorMessage.includes("Too many")
    ) {
      const delay = rateLimitService.getCurrentDelay(endpoint, "current-user");
      const seconds = Math.ceil(delay / 1000);

      return {
        type: "rate-limited",
        message: errorMessage,
        userMessage:
          seconds > 0
            ? `Please wait ${seconds} seconds before trying again`
            : "Server is busy, please try again in a moment",
      };
    }

    // Network connectivity errors
    if (
      errorMessage.includes("Network request failed") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection")
    ) {
      return {
        type: "offline",
        message: errorMessage,
        userMessage:
          "Connection error. Please check your internet and try again.",
      };
    }

    // Authentication errors
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("Authentication")
    ) {
      return {
        type: "error",
        message: errorMessage,
        userMessage: "Your session has expired. Please log in again.",
      };
    }

    // Validation errors
    if (errorMessage.includes("422") || errorMessage.includes("Validation")) {
      return {
        type: "error",
        message: errorMessage,
        userMessage: "Please check your information and try again.",
      };
    }

    // Server errors
    if (errorMessage.includes("500") || errorMessage.includes("Server error")) {
      return {
        type: "error",
        message: errorMessage,
        userMessage: "Server error. Please try again later.",
      };
    }

    // Default error
    return {
      type: "error",
      message: errorMessage,
      userMessage: "An error occurred. Please try again.",
    };
  },

  // Get user-friendly status message based on app state
  getStatusMessage: (isOnline, isLoading, lastError = null) => {
    if (!isOnline) {
      return {
        type: "offline",
        message: "You are currently offline. Some features may be limited.",
        visible: true,
      };
    }

    if (isLoading) {
      return {
        type: "loading",
        message: "Loading data...",
        visible: true,
      };
    }

    if (lastError) {
      const parsed = NetworkUtils.parseApiError(lastError);
      return {
        type: parsed.type,
        message: parsed.userMessage,
        visible: true,
      };
    }

    return {
      type: "info",
      message: "",
      visible: false,
    };
  },

  // Check if error suggests user should retry
  shouldRetry: (error) => {
    if (!error) return false;

    const errorMessage = error.message || error.toString();

    // Don't retry for authentication or validation errors
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("422") ||
      errorMessage.includes("Validation")
    ) {
      return false;
    }

    // Do retry for network or rate limiting errors
    return (
      errorMessage.includes("Network") ||
      errorMessage.includes("Rate limited") ||
      errorMessage.includes("Too many") ||
      errorMessage.includes("500") ||
      errorMessage.includes("503")
    );
  },

  // Get recommended wait time before retry
  getRetryDelay: (error, attempt = 1) => {
    if (!error) return 1000;

    const errorMessage = error.message || error.toString();

    if (
      errorMessage.includes("Rate limited") ||
      errorMessage.includes("Too many")
    ) {
      // Extract wait time from rate limiting service or use exponential backoff
      return Math.min(2000 * Math.pow(2, attempt - 1), 30000);
    }

    if (errorMessage.includes("Network")) {
      // Network errors - moderate backoff
      return Math.min(1000 * Math.pow(1.5, attempt - 1), 10000);
    }

    // Default backoff
    return Math.min(1000 * attempt, 5000);
  },
};

export default NetworkUtils;
