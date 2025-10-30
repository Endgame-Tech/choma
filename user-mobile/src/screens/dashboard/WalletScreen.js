import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import apiService from "../../services/api";
import * as Clipboard from "expo-clipboard";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const WalletScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [balance, setBalance] = useState(0);
  const [walletData, setWalletData] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountNumber, setAccountNumber] = useState("9874868014");

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const walletResponse = await apiService.getWalletData();
      // const cardsResponse = await apiService.getUserCards();

      // Mock data for now
      setBalance(0);
      setWalletData({
        accountNumber: "9874868014",
        bankName: "Paystack-Titan",
      });
      setCards([]);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = () => {
    // TODO: Navigate to add money screen or show add money modal
    navigation.navigate("AddMoneyScreen");
  };

  const handleCopyAccountNumber = async () => {
    try {
      await Clipboard.setStringAsync(accountNumber);
      Alert.alert("Copied", "Account number copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy account number");
    }
  };

  const handleAddCard = () => {
    // TODO: Navigate to add card screen or show add card modal
    navigation.navigate("AddCardScreen");
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading wallet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet</Text>
        <TouchableOpacity
          style={[styles.addMoneyButton, { backgroundColor: colors.primary }]}
          onPress={handleAddMoney}
        >
          <Ionicons name="add" size={20} color="#F8FFFC" />
          <Text style={styles.addMoneyText}>Add Money</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Available Balance Card */}
        <View style={styles.balanceSection}>
          <LinearGradient
            colors={isDark ? ["#2A2A2A", "#1A1A1A"] : ["#000000", "#333333"]}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity style={styles.balanceArrow}>
                <Ionicons name="arrow-forward" size={20} color="#F8FFFC" />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          </LinearGradient>
        </View>

        {/* Virtual Account Section */}
        <View style={styles.accountSection}>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
          <Text style={[styles.accountDescription, { color: colors.text }]}>
            Fund wallet with your{"\n"}virtual account number
          </Text>

          <View
            style={[styles.accountCard, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.bankName}>Paystack-Titan</Text>
            <View style={styles.accountNumberContainer}>
              <Text style={styles.accountNumber}>{accountNumber}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyAccountNumber}
              >
                <Ionicons name="copy-outline" size={16} color="#F8FFFC" />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Manage Cards Section */}
        <View style={styles.cardsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Manage Cards
          </Text>

          {cards.length > 0 ? (
            <View style={styles.cardsList}>
              {cards.map((card, index) => (
                <View
                  key={index}
                  style={[
                    styles.cardItem,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  {/* Card details would go here */}
                  <Text style={[styles.cardText, { color: colors.text }]}>
                    **** **** **** {card.lastFour}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.addCardButton, { borderColor: colors.border }]}
            onPress={handleAddCard}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
            <Text style={[styles.addCardText, { color: colors.text }]}>
              Add new debit card
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  addMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMoneyText: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceSection: {
    marginTop: 20,
    marginBottom: 32,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    ...THEME.shadows.medium,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    color: "#F8FFFC",
    fontSize: 16,
    fontWeight: "500",
  },
  balanceArrow: {
    padding: 4,
  },
  balanceAmount: {
    color: "#F8FFFC",
    fontSize: 32,
    fontWeight: "700",
  },
  accountSection: {
    marginBottom: 40,
  },
  newBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  newBadgeText: {
    color: "#F8FFFC",
    fontSize: 12,
    fontWeight: "600",
  },
  accountDescription: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    marginBottom: 20,
  },
  accountCard: {
    padding: 20,
    borderRadius: 16,
    ...THEME.shadows.light,
  },
  bankName: {
    color: "#F8FFFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  accountNumberContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountNumber: {
    color: "#F8FFFC",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  copyText: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  cardsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  cardsList: {
    marginBottom: 20,
  },
  cardItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...THEME.shadows.light,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "500",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
});

export default WalletScreen;
