import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../styles/theme';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const OnboardingScreen = ({ navigation, onComplete }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onboardingData = [
    {
      id: '1',
      title: 'Welcome to choma',
      description: 'Discover delicious, healthy Nigerian meals delivered fresh to your doorstep',
      image: require('../../../assets/images/meal-plans/healthyfam.jpg'),
      backgroundColor: colors.primary,
      gradientColors: [colors.primary, colors.primaryDark],
    },
    {
      id: '2',
      title: 'Fresh & Healthy Meals',
      description: 'All our meals are prepared with fresh ingredients and traditional Nigerian recipes',
      image: require('../../../assets/images/meal-plans/fitfuel.jpg'),
      backgroundColor: colors.warning,
      gradientColors: [colors.warning, colors.warningDark],
    },
    {
      id: '3',
      title: 'Convenient Delivery',
      description: 'Order your favorite meals and get them delivered fast and fresh to your location',
      image: require('../../../assets/images/meal-plans/wellness-hub.jpg'),
      backgroundColor: colors.info,
      gradientColors: [colors.info, colors.infoDark],
    },
    {
      id: '4',
      title: 'Track Your Orders',
      description: 'Real-time order tracking so you know exactly when your meal will arrive',
      image: require('../../../assets/images/meal-plans/recharge.jpg'),
      backgroundColor: colors.secondary,
      gradientColors: [colors.secondary, colors.secondaryDark],
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
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      // Call the completion callback to update the app state
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
      // Still call completion callback even on error
      if (onComplete) {
        onComplete();
      }
    }
  };

  const renderOnboardingItem = ({ item, index }) => (
    <LinearGradient
      colors={item.gradientColors}
      style={[styles(colors).slide, { backgroundColor: item.backgroundColor }]}
    >
      <View style={styles(colors).imageContainer}>
        <Image source={item.image} style={styles(colors).image} resizeMode="contain" />
      </View>
      
      <View style={styles(colors).contentContainer}>
        <Text style={styles(colors).title}>{item.title}</Text>
        <Text style={styles(colors).description}>{item.description}</Text>
      </View>
    </LinearGradient>
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
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
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width: screenWidth,
    height: screenHeight,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  image: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    maxHeight: 300,
  },
  contentContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});

export default OnboardingScreen;