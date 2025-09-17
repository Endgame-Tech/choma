// src/components/ui/NetworkTroubleshooter.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NetworkDiagnostics from "../../utils/networkDiagnostics";
import { APP_CONFIG } from "../../utils/constants";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const NetworkTroubleshooter = ({ isVisible, onClose }) => {
  const [diagnosticsResult, setDiagnosticsResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successfulUrls, setSuccessfulUrls] = useState([]);

  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible]);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setDiagnosticsResult(null);

    try {
      // Test current API connection
      const apiTest = await NetworkDiagnostics.testApiConnection();

      // Get network info
      const networkInfo = await NetworkDiagnostics.getNetworkInfo();

      // If main connection fails, test all possible connections
      let allTests = {};
      let working = [];

      if (!apiTest.success) {
        allTests = await NetworkDiagnostics.testAllConnections();

        // Find successful connections
        working = Object.entries(allTests)
          .filter(([_, result]) => result.success)
          .map(([url]) => url);

        setSuccessfulUrls(working);
      }

      setDiagnosticsResult({
        apiTest,
        networkInfo,
        allTests,
        workingUrls: working,
      });
    } catch (error) {
      console.error("Diagnostics error:", error);
      setDiagnosticsResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Network Diagnostics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current API Settings</Text>
              <Text style={styles.apiUrl}>{APP_CONFIG.API_BASE_URL}</Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.loadingText}>Running diagnostics...</Text>
              </View>
            ) : diagnosticsResult ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Network Status</Text>
                  {diagnosticsResult.networkInfo ? (
                    <View style={styles.resultItem}>
                      <Text style={styles.statusLabel}>Connected: </Text>
                      <Text
                        style={[
                          styles.statusValue,
                          diagnosticsResult.networkInfo.connected
                            ? styles.success
                            : styles.error,
                        ]}
                      >
                        {diagnosticsResult.networkInfo.connected ? "Yes" : "No"}
                      </Text>
                      <Text style={styles.statusLabel}>Connection Type: </Text>
                      <Text style={styles.statusValue}>
                        {diagnosticsResult.networkInfo.connectionType ||
                          "Unknown"}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.errorText}>
                      Could not retrieve network status
                    </Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>API Connection Test</Text>
                  {diagnosticsResult.apiTest ? (
                    <View style={styles.resultItem}>
                      <Text style={styles.statusLabel}>Status: </Text>
                      <Text
                        style={[
                          styles.statusValue,
                          diagnosticsResult.apiTest.success
                            ? styles.success
                            : styles.error,
                        ]}
                      >
                        {diagnosticsResult.apiTest.success
                          ? "Connected"
                          : "Failed"}
                      </Text>
                      {!diagnosticsResult.apiTest.success && (
                        <>
                          <Text style={styles.statusLabel}>Error: </Text>
                          <Text style={styles.errorText}>
                            {diagnosticsResult.apiTest.error || "Unknown error"}
                          </Text>
                        </>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.errorText}>
                      Could not test API connection
                    </Text>
                  )}
                </View>

                {successfulUrls.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Working API URLs</Text>
                    <Text style={styles.infoText}>
                      Try updating your API_BASE_URL in constants.js to one of
                      these URLs:
                    </Text>
                    {successfulUrls.map((url, index) => (
                      <View key={index} style={styles.urlItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#38a169"
                        />
                        <Text style={styles.urlText}>{url}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!diagnosticsResult.apiTest?.success &&
                  successfulUrls.length === 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Troubleshooting</Text>
                      <Text style={styles.infoText}>
                        No working connections were found. Try these steps:
                      </Text>
                      <View style={styles.troubleshootingItem}>
                        <Text style={styles.troubleshootingStep}>
                          1. Make sure your backend server is running
                        </Text>
                      </View>
                      <View style={styles.troubleshootingItem}>
                        <Text style={styles.troubleshootingStep}>
                          2. Verify both your mobile device and computer are on
                          the same WiFi network
                        </Text>
                      </View>
                      <View style={styles.troubleshootingItem}>
                        <Text style={styles.troubleshootingStep}>
                          3. Check if any firewall is blocking the connection
                        </Text>
                      </View>
                      <View style={styles.troubleshootingItem}>
                        <Text style={styles.troubleshootingStep}>
                          4. Try using a development build instead of Expo Go
                        </Text>
                      </View>
                    </View>
                  )}
              </>
            ) : diagnosticsResult?.error ? (
              <View style={styles.section}>
                <Text style={styles.errorTitle}>Error Running Diagnostics</Text>
                <Text style={styles.errorText}>{diagnosticsResult.error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.disabledButton]}
              onPress={runDiagnostics}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Run Diagnostics Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: "70%",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  apiUrl: {
    fontFamily: "monospace",
    fontSize: 14,
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  resultItem: {
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statusValue: {
    fontSize: 14,
    marginBottom: 8,
  },
  success: {
    color: "#38a169",
  },
  error: {
    color: "#e53e3e",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e53e3e",
    marginBottom: 8,
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  urlItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  urlText: {
    fontFamily: "monospace",
    fontSize: 13,
    marginLeft: 8,
  },
  troubleshootingItem: {
    marginBottom: 8,
  },
  troubleshootingStep: {
    fontSize: 14,
    color: "#666",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  button: {
    backgroundColor: "#4ECDC4",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default NetworkTroubleshooter;
