import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { COLORS } from "../utils/colors";
import { createStylesWithDMSans } from "../utils/fontUtils";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state to show the fallback UI
    return {
      hasError: true,
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (__DEV__) {
      console.error("Error Boundary caught an error:", error);
      console.error("Error Info:", errorInfo);
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    try {
      const errorReport = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        deviceInfo: await this.getDeviceInfo(),
        appInfo: await this.getAppInfo(),
        userInfo: await this.getUserInfo(),
        retryCount: this.state.retryCount,
      };

      // Store error locally for later sync
      await this.storeErrorLocally(errorReport);

      // Try to send to server if network is available
      await this.sendErrorToServer(errorReport);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  getDeviceInfo = async () => {
    try {
      return {
        platform: Platform.OS,
        version: Platform.Version,
        isPad: Platform.isPad,
        isTV: Platform.isTV,
        isTesting: Platform.isTesting,
        constants: Platform.constants,
      };
    } catch (error) {
      return { error: "Failed to get device info" };
    }
  };

  getAppInfo = async () => {
    try {
      return {
        appOwnership: Constants.appOwnership,
        expoVersion: Constants.expoVersion,
        installationId: Constants.installationId,
        deviceId: Constants.deviceId,
        sessionId: Constants.sessionId,
        platform: Constants.platform,
      };
    } catch (error) {
      return { error: "Failed to get app info" };
    }
  };

  getUserInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      return {
        hasToken: !!userToken,
        userId: userData ? JSON.parse(userData)?.id : null,
      };
    } catch (error) {
      return { error: "Failed to get user info" };
    }
  };

  storeErrorLocally = async (errorReport) => {
    try {
      const existingErrors = await AsyncStorage.getItem("errorReports");
      const errors = existingErrors ? JSON.parse(existingErrors) : [];

      errors.push(errorReport);

      // Keep only last 10 errors to avoid storage bloat
      const recentErrors = errors.slice(-10);

      await AsyncStorage.setItem("errorReports", JSON.stringify(recentErrors));
    } catch (error) {
      console.error("Failed to store error locally:", error);
    }
  };

  sendErrorToServer = async (errorReport) => {
    try {
      // This would be your error reporting endpoint
      const response = await fetch("/api/errors/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
        timeout: 10000,
      });

      if (response.ok) {
        console.log("Error reported successfully");
      }
    } catch (error) {
      // Network error or server unavailable
      console.log("Failed to send error to server:", error.message);
    }
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleRestart = async () => {
    try {
      // Clear some cached data that might be causing issues
      await AsyncStorage.removeItem("cachedData");
      await AsyncStorage.removeItem("tempData");

      // Reset to initial state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: 0,
      });
    } catch (error) {
      console.error("Failed to clear cache:", error);
      // Still try to restart
      this.handleRetry();
    }
  };

  handleSendFeedback = async () => {
    try {
      const errorDetails = {
        errorId: this.state.errorId,
        message: this.state.error?.message,
        timestamp: new Date().toISOString(),
      };

      // Open email client or feedback form
      // This is a placeholder - implement based on your feedback system
      console.log("Feedback would be sent:", errorDetails);
    } catch (error) {
      console.error("Failed to send feedback:", error);
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback } = this.props;

      // Use custom fallback if provided
      if (CustomFallback) {
        return (
          <CustomFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onRestart={this.handleRestart}
          />
        );
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              We're sorry for the inconvenience. The app encountered an
              unexpected error.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleRetry}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={this.handleRestart}
              >
                <Text style={styles.secondaryButtonText}>Restart App</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <ScrollView style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  Error ID: {this.state.errorId}
                </Text>
                <Text style={styles.debugText}>
                  Error: {this.state.error?.message}
                </Text>
                <Text style={styles.debugText}>
                  Stack: {this.state.error?.stack}
                </Text>
                <Text style={styles.debugText}>
                  Component Stack: {this.state.errorInfo?.componentStack}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={this.handleSendFeedback}
            >
              <Text style={styles.feedbackButtonText}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = (Component, fallbackComponent) => {
  return (props) => (
    <ErrorBoundary fallback={fallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// Hook for error reporting in functional components
export const useErrorReporting = () => {
  const reportError = async (error, context = {}) => {
    try {
      const errorReport = {
        id: Math.random().toString(36).substr(2, 9),
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        type: "manual_report",
      };

      // Store locally
      const existingErrors = await AsyncStorage.getItem("errorReports");
      const errors = existingErrors ? JSON.parse(existingErrors) : [];
      errors.push(errorReport);
      await AsyncStorage.setItem(
        "errorReports",
        JSON.stringify(errors.slice(-10))
      );

      // Try to send to server
      fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorReport),
        timeout: 5000,
      }).catch(() => {
        // Silently fail - error is already stored locally
      });
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  return { reportError };
};

// Custom error boundaries for specific sections
export const ScreenErrorBoundary = ({ children, screenName }) => (
  <ErrorBoundary
    fallback={({ onRetry }) => (
      <View style={styles.screenErrorContainer}>
        <Text style={styles.screenErrorTitle}>{screenName} Unavailable</Text>
        <Text style={styles.screenErrorMessage}>
          This screen is temporarily unavailable.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
          <Text style={styles.primaryButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary = ({ children, componentName }) => (
  <ErrorBoundary
    fallback={() => (
      <View style={styles.componentErrorContainer}>
        <Text style={styles.componentErrorText}>
          {componentName} failed to load
        </Text>
      </View>
    )}
  >
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: "center",
  },
  feedbackButton: {
    marginTop: 16,
  },
  feedbackButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  debugContainer: {
    marginTop: 24,
    maxHeight: 200,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  screenErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  screenErrorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  screenErrorMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  componentErrorContainer: {
    padding: 16,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    margin: 8,
  },
  componentErrorText: {
    color: "white",
    textAlign: "center",
    fontSize: 14,
  },
});

export default ErrorBoundary;
