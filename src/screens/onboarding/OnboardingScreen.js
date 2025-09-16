import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const OnboardingScreen = ({ navigation, onComplete }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onboardingData = [
    {
      id: "1",
      image: require("../../../assets/images/onboarding/getChomaWelcomeScreen1.jpg"),
    },
    {
      id: "2",
      image: require("../../../assets/images/onboarding/getChomaWelcomeScreen2.jpg"),
    },
    {
      id: "3",
      image: require("../../../assets/images/onboarding/getChomaWelcomeScreen3.jpg"),
    },
    {
      id: "4",
      image: require("../../../assets/images/onboarding/getChomaWelcomeScreen4.jpg"),
    },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
      // Call the completion callback to update the app state
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving onboarding completion:", error);
      // Still call completion callback even on error
      if (onComplete) {
        onComplete();
      }
    }
  };

  const renderOnboardingItem = ({ item, index }) => (
    <View style={styles(colors).slide}>
      <Image
        source={item.image}
        style={styles(colors).image}
        resizeMode="cover"
      />
    </View>
  );

  const renderPagination = () => (
    <View style={styles(colors).paginationContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles(colors).paginationDot,
            { opacity: index === currentIndex ? 1 : 0.3 },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles(colors).container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / screenWidth
          );
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      <View style={styles(colors).bottomContainer}>
        {renderPagination()}

        <View style={styles(colors).buttonContainer}>
          <TouchableOpacity
            style={styles(colors).skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles(colors).skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors).nextButton}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles(colors).nextButtonText}>
              {currentIndex === onboardingData.length - 1
                ? "Get Started"
                : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    slide: {
      width: screenWidth,
      height: screenHeight,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: screenWidth,
      height: screenHeight,
      borderRadius: 0,
    },
    bottomContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 30,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.white,
      marginHorizontal: 4,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    skipButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipButtonText: {
      fontSize: 16,
      color: colors.white,
      fontWeight: "500",
    },
    nextButton: {
      backgroundColor: colors.white,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      minWidth: 120,
      alignItems: "center",
    },
    nextButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "600",
    },
  });

export default OnboardingScreen;
