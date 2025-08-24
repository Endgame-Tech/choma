import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';

const CustomDatePicker = ({ 
  visible, 
  onConfirm, 
  onCancel, 
  initialDate = new Date(),
  minimumAge = 13,
  title = "Select Date"
}) => {
  const { colors } = useTheme();
  
  const [tempSelectedDay, setTempSelectedDay] = useState(initialDate.getDate());
  const [tempSelectedMonth, setTempSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [tempSelectedYear, setTempSelectedYear] = useState(initialDate.getFullYear());

  // Generate options for date picker
  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const generateDays = () => {
    const daysInMonth = getDaysInMonth(tempSelectedMonth, tempSelectedYear);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const generateMonths = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.map((month, index) => ({ label: month, value: index + 1 }));
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 100;
    const endYear = currentYear - minimumAge;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  };

  const handleConfirm = () => {
    const selectedDate = new Date(tempSelectedYear, tempSelectedMonth - 1, tempSelectedDay);
    onConfirm(selectedDate);
  };

  const handleCancel = () => {
    // Reset to initial values
    setTempSelectedDay(initialDate.getDate());
    setTempSelectedMonth(initialDate.getMonth() + 1);
    setTempSelectedYear(initialDate.getFullYear());
    onCancel();
  };

  // Update day if it's invalid for the selected month/year
  React.useEffect(() => {
    const daysInMonth = getDaysInMonth(tempSelectedMonth, tempSelectedYear);
    if (tempSelectedDay > daysInMonth) {
      setTempSelectedDay(daysInMonth);
    }
  }, [tempSelectedMonth, tempSelectedYear, tempSelectedDay]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles(colors).overlay}>
        <View style={styles(colors).modal}>
          <Text style={styles(colors).title}>{title}</Text>
          
          <View style={styles(colors).content}>
            <View style={styles(colors).row}>
              {/* Day Picker */}
              <View style={styles(colors).column}>
                <Text style={styles(colors).label}>Day</Text>
                <ScrollView 
                  style={styles(colors).scroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles(colors).scrollContent}
                >
                  {generateDays().map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles(colors).option,
                        tempSelectedDay === day && styles(colors).optionSelected
                      ]}
                      onPress={() => setTempSelectedDay(day)}
                    >
                      <Text style={[
                        styles(colors).optionText,
                        tempSelectedDay === day && styles(colors).optionTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles(colors).column}>
                <Text style={styles(colors).label}>Month</Text>
                <ScrollView 
                  style={styles(colors).scroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles(colors).scrollContent}
                >
                  {generateMonths().map(month => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles(colors).option,
                        tempSelectedMonth === month.value && styles(colors).optionSelected
                      ]}
                      onPress={() => setTempSelectedMonth(month.value)}
                    >
                      <Text style={[
                        styles(colors).optionText,
                        tempSelectedMonth === month.value && styles(colors).optionTextSelected
                      ]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles(colors).column}>
                <Text style={styles(colors).label}>Year</Text>
                <ScrollView 
                  style={styles(colors).scroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles(colors).scrollContent}
                >
                  {generateYears().reverse().map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles(colors).option,
                        tempSelectedYear === year && styles(colors).optionSelected
                      ]}
                      onPress={() => setTempSelectedYear(year)}
                    >
                      <Text style={[
                        styles(colors).optionText,
                        tempSelectedYear === year && styles(colors).optionTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles(colors).actions}>
            <TouchableOpacity
              style={[styles(colors).button, styles(colors).buttonSecondary]}
              onPress={handleCancel}
            >
              <Text style={styles(colors).buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(colors).button, styles(colors).buttonPrimary]}
              onPress={handleConfirm}
            >
              <Text style={styles(colors).buttonTextPrimary}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: THEME.borderRadius.medium,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: 5,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default CustomDatePicker;