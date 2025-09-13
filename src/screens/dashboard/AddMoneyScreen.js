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

const AddMoneyScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  const handleAmountSelect = (value) => {
    setAmount(value.toString());
  };

  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual payment logic
      Alert.alert(
        "Coming Soon",
        "Add money functionality will be available soon"
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add money. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `₦${parseInt(value).toLocaleString()}`;
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
          Add Money
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Enter Amount
          </Text>
          <View
            style={[
              styles.amountContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.currencySymbol, { color: colors.textSecondary }]}
            >
              ₦
            </Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Quick Amount Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Select
          </Text>
          <View style={styles.amountGrid}>
            {predefinedAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.amountButton,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      amount === value.toString()
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => handleAmountSelect(value)}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    {
                      color:
                        amount === value.toString()
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {formatCurrency(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Payment Method
          </Text>
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.paymentMethodLeft}>
              <Ionicons name="card-outline" size={24} color={colors.primary} />
              <Text style={[styles.paymentMethodText, { color: colors.text }]}>
                Debit/Credit Card
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Money Button */}
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
              opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleAddMoney}
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          <Text style={styles.addButtonText}>
            {loading
              ? "Processing..."
              : `Add ${amount ? formatCurrency(amount) : "Money"}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  amountButton: {
    width: "48%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: 12,
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
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
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default AddMoneyScreen;
