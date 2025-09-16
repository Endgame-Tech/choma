// src/components/demo/FontWeightDemo.js - Demo component to test font weight mapping
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import { useTheme } from '../../styles/theme';

const FontWeightDemo = () => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles(colors).container}>
      <Text style={styles(colors).title}>DM Sans Font Weight Demo</Text>
      
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Numeric Font Weights</Text>
        <Text style={styles(colors).weight100}>Weight 100 - Thin</Text>
        <Text style={styles(colors).weight200}>Weight 200 - Extra Light</Text>
        <Text style={styles(colors).weight300}>Weight 300 - Light</Text>
        <Text style={styles(colors).weight400}>Weight 400 - Regular</Text>
        <Text style={styles(colors).weight500}>Weight 500 - Medium</Text>
        <Text style={styles(colors).weight600}>Weight 600 - Semi Bold</Text>
        <Text style={styles(colors).weight700}>Weight 700 - Bold</Text>
        <Text style={styles(colors).weight800}>Weight 800 - Extra Bold</Text>
        <Text style={styles(colors).weight900}>Weight 900 - Black</Text>
      </View>

      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>String Font Weights</Text>
        <Text style={styles(colors).weightBold}>fontWeight: 'bold'</Text>
        <Text style={styles(colors).weightSemiBold}>fontWeight: '600'</Text>
        <Text style={styles(colors).weightMedium}>fontWeight: '500'</Text>
        <Text style={styles(colors).weightNormal}>fontWeight: 'normal'</Text>
      </View>

      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Common UI Elements</Text>
        <Text style={styles(colors).heading}>This is a heading</Text>
        <Text style={styles(colors).subheading}>This is a subheading</Text>
        <Text style={styles(colors).body}>This is body text with regular weight</Text>
        <Text style={styles(colors).caption}>This is caption text</Text>
        <Text style={styles(colors).price}>₦25,000</Text>
      </View>
    </ScrollView>
  );
};

const styles = (colors) => createStylesWithDMSans({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold', // Will be mapped to DMSans-Bold
    color: colors.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600', // Will be mapped to DMSans-SemiBold
    color: colors.text,
    marginBottom: 15,
  },
  // Numeric weights
  weight100: {
    fontSize: 16,
    fontWeight: 100, // Will be mapped to DMSans-Thin
    color: colors.text,
    marginBottom: 8,
  },
  weight200: {
    fontSize: 16,
    fontWeight: 200, // Will be mapped to DMSans-ExtraLight
    color: colors.text,
    marginBottom: 8,
  },
  weight300: {
    fontSize: 16,
    fontWeight: 300, // Will be mapped to DMSans-Light
    color: colors.text,
    marginBottom: 8,
  },
  weight400: {
    fontSize: 16,
    fontWeight: 400, // Will be mapped to DMSans-Regular
    color: colors.text,
    marginBottom: 8,
  },
  weight500: {
    fontSize: 16,
    fontWeight: 500, // Will be mapped to DMSans-Medium
    color: colors.text,
    marginBottom: 8,
  },
  weight600: {
    fontSize: 16,
    fontWeight: 600, // Will be mapped to DMSans-SemiBold
    color: colors.text,
    marginBottom: 8,
  },
  weight700: {
    fontSize: 16,
    fontWeight: 700, // Will be mapped to DMSans-Bold
    color: colors.text,
    marginBottom: 8,
  },
  weight800: {
    fontSize: 16,
    fontWeight: 800, // Will be mapped to DMSans-ExtraBold
    color: colors.text,
    marginBottom: 8,
  },
  weight900: {
    fontSize: 16,
    fontWeight: 900, // Will be mapped to DMSans-Black
    color: colors.text,
    marginBottom: 8,
  },
  // String weights
  weightBold: {
    fontSize: 16,
    fontWeight: 'bold', // Will be mapped to DMSans-Bold
    color: colors.text,
    marginBottom: 8,
  },
  weightSemiBold: {
    fontSize: 16,
    fontWeight: '600', // Will be mapped to DMSans-SemiBold
    color: colors.text,
    marginBottom: 8,
  },
  weightMedium: {
    fontSize: 16,
    fontWeight: '500', // Will be mapped to DMSans-Medium
    color: colors.text,
    marginBottom: 8,
  },
  weightNormal: {
    fontSize: 16,
    fontWeight: 'normal', // Will be mapped to DMSans-Regular
    color: colors.text,
    marginBottom: 8,
  },
  // Common UI elements
  heading: {
    fontSize: 20,
    fontWeight: 'bold', // Will be mapped to DMSans-Bold
    color: colors.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600', // Will be mapped to DMSans-SemiBold
    color: colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    fontWeight: 'normal', // Will be mapped to DMSans-Regular
    color: colors.text,
    marginBottom: 8,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500', // Will be mapped to DMSans-Medium
    color: colors.textSecondary,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold', // Will be mapped to DMSans-Bold
    color: colors.primary,
  },
});

export default FontWeightDemo;