// src/screens/auth/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onboardingSteps = [
    {
      key: '1',
      title: 'Discover & Personalize',
      description: 'Find meal plans tailored to your lifestyle and dietary needs.',
      icon: 'search-outline',
      backgroundColor: colors.cardBackground,
    },
    {
      key: '2',
      title: 'Order with Ease',
      description: 'Subscribe once, and get your meals delivered weekly like clockwork.',
      icon: 'calendar-outline',
      backgroundColor: colors.modalBackground,
    },
    {
      key: '3',
      title: 'Eat & Achieve',
      description: 'Enjoy delicious, healthy meals and reach your wellness goals.',
      icon: 'trophy-outline',
      backgroundColor: colors.background,
    },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingSteps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const renderItem = ({ item }) => (
    <View style={[styles(colors).slide, { backgroundColor: item.backgroundColor }]}>
      <Ionicons name={item.icon} size={120} color={colors.primary} />
      <Text style={styles(colors).title}>{item.title}</Text>
      <Text style={styles(colors).description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.key}
      />
      <View style={styles(colors).footer}>
        <View style={styles(colors).pagination}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles(colors).dot,
                currentIndex === index ? styles(colors).dotActive : null,
              ]}
            />
          ))}
        </View>
        <View style={styles(colors).buttonContainer}>
          <TouchableOpacity style={styles(colors).skipButton} onPress={handleSkip}>
            <Text style={styles(colors).skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles(colors).nextButton} onPress={handleNext}>
            <Text style={styles(colors).nextButtonText}>
              {currentIndex === onboardingSteps.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: THEME.spacing.xl,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: THEME.spacing.md,
  },
  footer: {
    padding: THEME.spacing.lg,
    backgroundColor: colors.background,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: THEME.spacing.md,
  },
  skipButtonText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.xl,
  },
  nextButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: THEME.spacing.sm,
  },
});

export default OnboardingScreen;