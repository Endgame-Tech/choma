import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../styles/theme';

const HelpScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={styles(colors).container}>
      <Text style={styles(colors).text}>Help Screen</Text>
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});

export default HelpScreen;