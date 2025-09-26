import * as Linking from "expo-linking";
import { Alert } from "react-native";

class DeepLinkingService {
  constructor() {
    this.prefixes = ["choma://", "com.choma.app://"];
    this.initialized = false;
    this.navigationRef = null;
  }

  initialize(navigationRef) {
    this.navigationRef = navigationRef;
    this.initialized = true;

    // Handle app launch from deep link
    this.handleInitialURL();

    // Handle deep links when app is running
    this.setupLinkingListener();

    console.log("🔗 Deep linking initialized");
  }

  async handleInitialURL() {
    try {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        console.log("App opened with deep link:", initialURL);
        this.handleDeepLink(initialURL);
      }
    } catch (error) {
      console.error("Error handling initial URL:", error);
    }
  }

  setupLinkingListener() {
    const handleURL = (event) => {
      console.log("Deep link received:", event.url);
      this.handleDeepLink(event.url);
    };

    // Add event listener for incoming links
    const subscription = Linking.addEventListener("url", handleURL);

    return () => {
      subscription.remove();
    };
  }

  handleDeepLink(url) {
    if (!this.initialized || !this.navigationRef) {
      console.warn("Deep linking not initialized or navigation ref not set");
      return;
    }

    try {
      const parsedUrl = Linking.parse(url);
      const { hostname, path, queryParams } = parsedUrl;

      console.log("Parsed deep link:", { hostname, path, queryParams });

      // Handle OAuth redirect for both schemes
      if (hostname === "oauthredirect" || url.includes("oauthredirect")) {
        this.handleOAuthRedirect(path, queryParams, this.navigationRef.current);
        return;
      }

      // Handle expo-development-client links
      if (hostname === "expo-development-client") {
        console.log("🔄 Expo development client link handled");
        return;
      }

      this.navigateToScreen(hostname, path, queryParams);
    } catch (error) {
      console.error("Error parsing deep link:", error);
      // Don't show alert for OAuth redirects - they're handled automatically
      if (
        !url.includes("oauthredirect") &&
        !url.includes("expo-development-client")
      ) {
        Alert.alert("Error", "Invalid link format");
      }
    }
  }

  navigateToScreen(hostname, path, queryParams) {
    const navigation = this.navigationRef.current;
    if (!navigation) {
      console.warn("Navigation ref not available");
      return;
    }

    try {
      switch (hostname) {
        case "meal-plan":
          this.handleMealPlanLink(path, queryParams, navigation);
          break;
        case "order":
          this.handleOrderLink(path, queryParams, navigation);
          break;
        case "subscription":
          this.handleSubscriptionLink(path, queryParams, navigation);
          break;
        case "profile":
          this.handleProfileLink(path, queryParams, navigation);
          break;
        case "notification":
          this.handleNotificationLink(path, queryParams, navigation);
          break;
        case "referral":
          this.handleReferralLink(path, queryParams, navigation);
          break;
        case "oauthredirect":
          this.handleOAuthRedirect(path, queryParams, navigation);
          break;
        default:
          console.warn("Unknown deep link hostname:", hostname);
          navigation.navigate("Main", { screen: "Home" });
      }
    } catch (error) {
      console.error("Error navigating to screen:", error);
    }
  }

  handleMealPlanLink(path, queryParams, navigation) {
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      // Navigate to meal plans list
      navigation.navigate("Main", { screen: "Home" });
    } else if (pathSegments.length === 1) {
      // Navigate to specific meal plan
      const mealPlanId = pathSegments[0];
      navigation.navigate("MealPlanDetail", { mealPlanId });
    } else if (pathSegments.length === 2 && pathSegments[1] === "customize") {
      // Navigate to meal plan customization
      const mealPlanId = pathSegments[0];
      navigation.navigate("Customize", { mealPlanId });
    }
  }

  handleOrderLink(path, queryParams, navigation) {
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      // Navigate to orders list
      navigation.navigate("Main", { screen: "Orders" });
    } else if (pathSegments.length === 1) {
      // Navigate to specific order
      const orderId = pathSegments[0];
      navigation.navigate("OrderDetail", { orderId });
    }
  }

  handleSubscriptionLink(path, queryParams, navigation) {
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      // Navigate to subscription screen
      navigation.navigate("Subscription");
    } else if (pathSegments.length === 1) {
      // Navigate to specific subscription
      const subscriptionId = pathSegments[0];
      navigation.navigate("SubscriptionDetails", { subscriptionId });
    }
  }

  handleProfileLink(path, queryParams, navigation) {
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      // Navigate to profile
      navigation.navigate("Main", { screen: "Profile" });
    } else if (pathSegments[0] === "settings") {
      // Navigate to settings
      navigation.navigate("Settings");
    }
  }

  handleNotificationLink(path, queryParams, navigation) {
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      // Navigate to notifications list
      navigation.navigate("Notifications");
    } else if (pathSegments.length === 1) {
      // Navigate to specific notification
      const notificationId = pathSegments[0];
      navigation.navigate("NotificationDetail", { notificationId });
    }
  }

  handleReferralLink(path, queryParams, navigation) {
    const { code } = queryParams;

    if (code) {
      // Handle referral code
      navigation.navigate("Signup", { referralCode: code });
    } else {
      navigation.navigate("Main", { screen: "Home" });
    }
  }

  handleOAuthRedirect(path, queryParams, navigation) {
    console.log("🔍 OAuth redirect received:", { path, queryParams });

    // Check if this has OAuth parameters
    if (queryParams && (queryParams.code || queryParams.error)) {
      console.log("✅ OAuth parameters found:", {
        hasCode: !!queryParams.code,
        hasError: !!queryParams.error,
        state: queryParams.state,
      });

      // expo-auth-session will automatically handle this redirect
      // We just need to make sure the deep link doesn't interfere
      console.log("🔄 Letting expo-auth-session handle OAuth response");
    } else {
      console.log("⚠️ OAuth redirect without expected parameters");
    }
  }

  // Generate deep links
  generateMealPlanLink(mealPlanId) {
    return `${this.prefixes[0]}meal-plan/${mealPlanId}`;
  }

  generateOrderLink(orderId) {
    return `${this.prefixes[0]}order/${orderId}`;
  }

  generateSubscriptionLink(subscriptionId) {
    return `${this.prefixes[0]}subscription/${subscriptionId}`;
  }

  generateReferralLink(referralCode) {
    return `${this.prefixes[0]}referral?code=${referralCode}`;
  }

  generateNotificationLink(notificationId) {
    return `${this.prefixes[0]}notification/${notificationId}`;
  }

  generateProfileLink() {
    return `${this.prefixes[0]}profile`;
  }

  generateSettingsLink() {
    return `${this.prefixes[0]}profile/settings`;
  }

  // Share functionality
  async shareMealPlan(mealPlanId, mealPlanTitle) {
    const link = this.generateMealPlanLink(mealPlanId);

    try {
      await Linking.openURL(`https://share.choma.com/meal-plan/${mealPlanId}`);
    } catch (error) {
      console.error("Error sharing meal plan:", error);
      Alert.alert("Error", "Failed to share meal plan");
    }
  }

  async shareReferral(referralCode) {
    const link = this.generateReferralLink(referralCode);

    try {
      await Linking.openURL(link);
    } catch (error) {
      console.error("Error sharing referral:", error);
      Alert.alert("Error", "Failed to share referral");
    }
  }

  // Open external links
  async openExternalLink(url) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      console.error("Error opening external link:", error);
      Alert.alert("Error", "Failed to open link");
    }
  }

  // URL validation
  isValidChomaLink(url) {
    return this.prefixes.some((prefix) => url.startsWith(prefix));
  }

  // Get current URL scheme
  getURLScheme() {
    return this.prefixes[0].replace("://", "");
  }
}

export default new DeepLinkingService();
