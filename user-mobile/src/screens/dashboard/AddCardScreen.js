import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const AddCardScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted;
  };

  const formatExpiryDate = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    if (formatted.length <= 19) {
      // 16 digits + 3 spaces
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (text) => {
    const formatted = formatExpiryDate(text);
    if (formatted.length <= 5) {
      // MM/YY
      setExpiryDate(formatted);
    }
  };

  const handleCvvChange = (text) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length <= 4) {
      setCvv(cleaned);
    }
  };

  const handleAddCard = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
      Alert.alert("Error", "Please fill in all card details");
      return;
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      Alert.alert("Error", "Please enter a valid 16-digit card number");
      return;
    }

    if (expiryDate.length !== 5) {
      Alert.alert("Error", "Please enter a valid expiry date (MM/YY)");
      return;
    }

    if (cvv.length < 3) {
      Alert.alert("Error", "Please enter a valid CVV");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual card addition logic
      Alert.alert(
        "Coming Soon",
        "Add card functionality will be available soon"
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, "");
    if (cleaned.startsWith("4")) return "visa";
    if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "mastercard";
    if (cleaned.startsWith("3")) return "amex";
    return "card";
  };

  const getCardIcon = () => {
    const type = getCardType(cardNumber);
    switch (type) {
      case "visa":
        return "card-outline";
      case "mastercard":
        return "card-outline";
      case "amex":
        return "card-outline";
      default:
        return "card-outline";
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Card
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: colors.primary }]}>
          <View style={styles.cardHeader}>
            <Ionicons name={getCardIcon()} size={32} color="#F8FFFC" />
            <Text style={styles.cardType}>
              {getCardType(cardNumber).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardNumberPreview}>
            {cardNumber || "•••• •••• •••• ••••"}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardName}>
              {cardHolderName || "CARD HOLDER NAME"}
            </Text>
            <Text style={styles.cardExpiry}>{expiryDate || "MM/YY"}</Text>
          </View>
        </View>

        {/* Card Details Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Card Number
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Ionicons
                name={getCardIcon()}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Card Holder Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={cardHolderName}
                onChangeText={setCardHolderName}
                placeholder="John Doe"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Expiry Date
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={expiryDate}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>CVV</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={cvv}
                  onChangeText={handleCvvChange}
                  placeholder="123"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={colors.success}
            />
            <Text
              style={[styles.securityText, { color: colors.textSecondary }]}
            >
              Your card information is encrypted and secure
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Card Button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primary,
              opacity:
                !cardNumber || !expiryDate || !cvv || !cardHolderName ? 0.5 : 1,
            },
          ]}
          onPress={handleAddCard}
          disabled={
            loading || !cardNumber || !expiryDate || !cvv || !cardHolderName
          }
        >
          <Text style={styles.addButtonText}>
            {loading ? "Adding Card..." : "Add Card"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardPreview: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    minHeight: 200,
    justifyContent: "space-between",
    ...THEME.shadows.medium,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "600",
  },
  cardNumberPreview: {
    color: "#F8FFFC",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 2,
    marginVertical: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "500",
  },
  cardExpiry: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    marginTop: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
  },
  securityText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#F8FFFC",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default AddCardScreen;
