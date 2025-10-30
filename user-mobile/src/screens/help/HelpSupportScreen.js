// src/screens/help/HelpSupportScreen.js - Enhanced Help & Support Center
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import StandardHeader from "../../components/layout/Header";
import apiService from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const HelpSupportScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess, showConfirm, showInfo } = useAlert();
  const [selectedTab, setSelectedTab] = useState("faq");
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    category: "general",
    priority: "medium",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFAQs();
    if (selectedTab === "tickets") {
      loadSupportTickets();
    }
  }, [selectedTab]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const result = await apiService.getFAQs();

      if (result.success) {
        setFaqs(result.data || []);
      } else {
        // Fallback FAQs
        setFaqs([
          {
            id: 1,
            question: "How do I place an order?",
            answer:
              "You can place an order by browsing our meal plans, selecting your preferred plan, customizing it to your needs, and proceeding to checkout. We accept various payment methods for your convenience.",
            category: "orders",
          },
          {
            id: 2,
            question: "What are your delivery hours?",
            answer:
              "We deliver Monday to Sunday from 8:00 AM to 8:00 PM. You can schedule your delivery for a convenient time during checkout.",
            category: "delivery",
          },
          {
            id: 3,
            question: "Can I cancel or modify my order?",
            answer:
              "You can cancel or modify your order up to 2 hours before the scheduled delivery time. Go to your Orders section to make changes.",
            category: "orders",
          },
          {
            id: 4,
            question: "Do you offer vegetarian/vegan options?",
            answer:
              "Yes! We have a wide variety of vegetarian and vegan meal plans. You can filter by dietary preferences when browsing our menu.",
            category: "menu",
          },
          {
            id: 5,
            question: "How do I track my order?",
            answer:
              "Once your order is confirmed, you can track it in real-time through the Orders section in your profile. You'll receive notifications about status updates.",
            category: "delivery",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to load FAQs:", error);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSupportTickets = async () => {
    try {
      setTicketsLoading(true);
      const result = await apiService.getSupportTickets();

      if (result.success) {
        setTickets(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load support tickets:", error);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const submitContactForm = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      showError(
        "Missing Information",
        "Please fill in both subject and message fields."
      );
      return;
    }

    try {
      setSubmitting(true);

      // Log activity
      await apiService.logUserActivity?.({
        action: "support_ticket_create",
        description: `Created support ticket: ${contactForm.subject}`,
        timestamp: new Date().toISOString(),
        metadata: {
          screen: "HelpSupportScreen",
          category: contactForm.category,
          priority: contactForm.priority,
        },
      });

      const result = await apiService.submitSupportTicket(
        contactForm.subject,
        contactForm.message,
        contactForm.category
      );

      if (result.success) {
        Alert.alert(
          "Ticket Submitted",
          "Your support ticket has been submitted successfully. We'll get back to you within 24 hours.",
          [
            {
              text: "OK",
              onPress: () => {
                setContactForm({
                  subject: "",
                  message: "",
                  category: "general",
                  priority: "medium",
                });
                setSelectedTab("tickets");
                loadSupportTickets();
              },
            },
          ]
        );
      } else {
        showError(
          "Submission Failed",
          result.error || "Unable to submit your ticket. Please try again."
        );
      }
    } catch (error) {
      console.error("Support ticket submission error:", error);
      showError("Error", "Failed to submit support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneCall = () => {
    Alert.alert("Call Support", "Would you like to call our support team?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call Now",
        onPress: () => Linking.openURL("tel:+2348000000000"),
      },
    ]);
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@choma.ng?subject=Support Request");
  };

  const handleWhatsApp = () => {
    Linking.openURL(
      "whatsapp://send?phone=2348000000000&text=Hi, I need help with choma"
    );
  };

  const renderTabBar = () => (
    <View style={styles(colors).tabBar}>
      {[
        { id: "faq", label: "FAQ", icon: "help-circle-outline" },
        { id: "contact", label: "Contact", icon: "mail-outline" },
        { id: "tickets", label: "My Tickets", icon: "list-outline" },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles(colors).tabItem,
            selectedTab === tab.id && styles(colors).tabItemActive,
          ]}
          onPress={() => setSelectedTab(tab.id)}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={selectedTab === tab.id ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles(colors).tabLabel,
              selectedTab === tab.id && styles(colors).tabLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFAQTab = () => (
    <View style={styles(colors).tabContent}>
      {loading ? (
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading FAQs...</Text>
        </View>
      ) : (
        <View style={styles(colors).faqContainer}>
          {faqs.map((faq, index) => (
            <View key={faq.id || index} style={styles(colors).faqItem}>
              <TouchableOpacity
                style={styles(colors).faqQuestion}
                onPress={() =>
                  setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                }
              >
                <Text style={styles(colors).faqQuestionText}>
                  {faq.question}
                </Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {expandedFAQ === faq.id && (
                <View style={styles(colors).faqAnswer}>
                  <Text style={styles(colors).faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderContactTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Quick Contact Options */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Quick Contact</Text>
        <View style={styles(colors).contactOptions}>
          <TouchableOpacity
            style={styles(colors).contactOption}
            onPress={handlePhoneCall}
          >
            <View style={styles(colors).contactIconContainer}>
              <Ionicons name="call" size={24} color={colors.primary} />
            </View>
            <Text style={styles(colors).contactOptionText}>Call Us</Text>
            <Text style={styles(colors).contactOptionSubtext}>
              +234 800 000 0000
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors).contactOption}
            onPress={handleEmailSupport}
          >
            <View style={styles(colors).contactIconContainer}>
              <Ionicons name="mail" size={24} color={colors.primary} />
            </View>
            <Text style={styles(colors).contactOptionText}>Email Us</Text>
            <Text style={styles(colors).contactOptionSubtext}>
              support@choma.ng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors).contactOption}
            onPress={handleWhatsApp}
          >
            <View style={styles(colors).contactIconContainer}>
              <Ionicons name="logo-whatsapp" size={24} color={colors.success} />
            </View>
            <Text style={styles(colors).contactOptionText}>WhatsApp</Text>
            <Text style={styles(colors).contactOptionSubtext}>
              Chat with us
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact Form */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Send us a Message</Text>

        <View style={styles(colors).form}>
          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Category</Text>
            <View style={styles(colors).pickerContainer}>
              <TouchableOpacity
                style={styles(colors).picker}
                onPress={() => {
                  Alert.alert(
                    "Select Category",
                    "Choose the category that best describes your issue",
                    [
                      {
                        text: "General",
                        onPress: () =>
                          setContactForm((prev) => ({
                            ...prev,
                            category: "general",
                          })),
                      },
                      {
                        text: "Order Issues",
                        onPress: () =>
                          setContactForm((prev) => ({
                            ...prev,
                            category: "orders",
                          })),
                      },
                      {
                        text: "Payment",
                        onPress: () =>
                          setContactForm((prev) => ({
                            ...prev,
                            category: "payment",
                          })),
                      },
                      {
                        text: "Delivery",
                        onPress: () =>
                          setContactForm((prev) => ({
                            ...prev,
                            category: "delivery",
                          })),
                      },
                      {
                        text: "Account",
                        onPress: () =>
                          setContactForm((prev) => ({
                            ...prev,
                            category: "account",
                          })),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles(colors).pickerText}>
                  {contactForm.category.charAt(0).toUpperCase() +
                    contactForm.category.slice(1)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Subject *</Text>
            <TextInput
              style={styles(colors).input}
              value={contactForm.subject}
              onChangeText={(text) =>
                setContactForm((prev) => ({ ...prev, subject: text }))
              }
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Message *</Text>
            <TextInput
              style={[styles(colors).input, styles(colors).textArea]}
              value={contactForm.message}
              onChangeText={(text) =>
                setContactForm((prev) => ({ ...prev, message: text }))
              }
              placeholder="Please provide detailed information about your issue"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[
              styles(colors).submitButton,
              submitting && styles(colors).submitButtonDisabled,
            ]}
            onPress={submitContactForm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles(colors).submitButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTicketsTab = () => (
    <View style={styles(colors).tabContent}>
      {ticketsLoading ? (
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading your tickets...
          </Text>
        </View>
      ) : tickets.length > 0 ? (
        <View style={styles(colors).ticketsContainer}>
          {tickets.map((ticket) => (
            <View
              key={ticket._id || ticket.id}
              style={styles(colors).ticketItem}
            >
              <View style={styles(colors).ticketHeader}>
                <Text style={styles(colors).ticketSubject}>
                  {ticket.subject}
                </Text>
                <View
                  style={[
                    styles(colors).ticketStatus,
                    {
                      backgroundColor:
                        ticket.status === "open"
                          ? colors.warning + "20"
                          : colors.success + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles(colors).ticketStatusText,
                      {
                        color:
                          ticket.status === "open"
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  >
                    {ticket.status === "open" ? "Open" : "Resolved"}
                  </Text>
                </View>
              </View>
              <Text style={styles(colors).ticketMessage} numberOfLines={2}>
                {ticket.message}
              </Text>
              <Text style={styles(colors).ticketDate}>
                {new Date(ticket.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles(colors).emptyContainer}>
          <Ionicons name="chatbox-outline" size={64} color={colors.textMuted} />
          <Text style={styles(colors).emptyTitle}>No Support Tickets</Text>
          <Text style={styles(colors).emptyText}>
            You haven't submitted any support tickets yet.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <StandardHeader
        title="Help & Support"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      {renderTabBar()}

      <ScrollView
        style={styles(colors).scrollView}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {selectedTab === "faq" && renderFAQTab()}
        {selectedTab === "contact" && renderContactTab()}
        {selectedTab === "tickets" && renderTicketsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      paddingHorizontal: 10,
    },
    tabItemActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      fontSize: 14,
      color: colors.textMuted,
      marginLeft: 6,
      fontWeight: "500",
    },
    tabLabelActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    tabContent: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 15,
      fontSize: 16,
      color: colors.textSecondary,
    },
    faqContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    faqItem: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    faqQuestion: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 15,
    },
    faqQuestionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginRight: 10,
    },
    faqAnswer: {
      paddingHorizontal: 15,
      paddingBottom: 15,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    faqAnswerText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      paddingTop: 10,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 20,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    contactOptions: {
      gap: 15,
    },
    contactOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    contactOptionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    contactOptionSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    form: {
      gap: 15,
    },
    inputContainer: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    input: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    pickerContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    picker: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingVertical: 12,
    },
    pickerText: {
      fontSize: 16,
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: THEME.borderRadius.medium,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 10,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    ticketsContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 15,
    },
    ticketItem: {
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ticketHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    ticketSubject: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginRight: 10,
    },
    ticketStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: THEME.borderRadius.small,
    },
    ticketStatusText: {
      fontSize: 12,
      fontWeight: "500",
    },
    ticketMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    ticketDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });
