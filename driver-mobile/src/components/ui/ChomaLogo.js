import React from 'react';
import { View, Text } from 'react-native';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import { useTheme } from '../../styles/theme';

const ChomaLogo = ({ width = 150, height = 82, style = {} }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles(colors).container, { width, height }, style]}>
      <Text style={[styles(colors).logo, { fontSize: width * 0.2 }]}>
        Choma
      </Text>
      <Text style={[styles(colors).subtitle, { fontSize: width * 0.08 }]}>
        Driver
      </Text>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 2,
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: -5,
    },
  });

export default ChomaLogo;