// src/components/meal-plans/MealPlanDetailSkeleton.js
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from '../ui/Skeleton';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const MealPlanDetailSkeleton = () => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles(colors).container}>
      <ScrollView>
        <Skeleton height={300} style={{ margin: 20, borderRadius: THEME.borderRadius.large }} />
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton height={30} width={'70%'} style={{ marginBottom: 15 }} />
          <Skeleton height={16} width={'90%'} style={{ marginBottom: 8 }} />
          <Skeleton height={16} width={'80%'} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <Skeleton height={20} width={80} style={{ marginRight: 20 }} />
            <Skeleton height={20} width={100} style={{ marginRight: 20 }} />
            <Skeleton height={20} width={120} />
          </View>
          <Skeleton height={40} width={'100%'} style={{ marginBottom: 20 }} />
        </View>
        <View style={{ padding: 20, backgroundColor: colors.cardBackground, marginHorizontal: 20, borderRadius: THEME.borderRadius.large, marginBottom: 20 }}>
          <Skeleton height={24} width={'50%'} style={{ marginBottom: 20 }} />
          <Skeleton height={60} width={'100%'} style={{ marginBottom: 15 }} />
          <Skeleton height={60} width={'100%'} />
        </View>
        <View style={{ padding: 20 }}>
          <Skeleton height={24} width={'50%'} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Skeleton height={60} width={60} />
            <Skeleton height={60} width={60} />
            <Skeleton height={60} width={60} />
            <Skeleton height={60} width={60} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default MealPlanDetailSkeleton;
