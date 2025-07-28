import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HelpCenterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const handleReplayTutorial = async () => {
    try {
      await AsyncStorage.removeItem('hasLaunched');
      Alert.alert(
        'Tutorial Reset',
        'The tutorial will now play the next time you visit the home screen.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not reset the tutorial.');
    }
  };

  const faqs = [
    {
      id: 1,
      question: "How do I place an order?",
      answer: "You can place an order by browsing our meal plans, selecting your preferred meals, and following the checkout process. We'll guide you through each step!"
    },
    {
      id: 2,
      question: "What are your delivery hours?",
      answer: "We deliver from 9 AM to 8 PM, Monday through Sunday. You can choose your preferred delivery time during checkout."
    },
    {
      id: 3,
      question: "Can I modify my subscription?",
      answer: "Yes! You can modify, pause, or cancel your subscription anytime through your profile settings. Changes take effect from your next billing cycle."
    },
    {
      id: 4,
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, and bank transfers. All payments are processed securely through our payment partners."
    },
    {
      id: 5,
      question: "How do I track my order?",
      answer: "Once your order is confirmed, you'll receive a tracking link via SMS and email. You can also track your order in real-time through the app."
    },
    {
      id: 6,
      question: "What if I'm not satisfied with my meal?",
      answer: "Your satisfaction is our priority! If you're not happy with any meal, please contact us within 24 hours and we'll make it right."
    }
  ];

  const contactOptions = [
    {
      id: 1,
      title: "Email Support",
      subtitle: "Get help via email",
      icon: "mail",
      action: () => Linking.openURL('mailto:support@mychef.app')
    },
    {
      id: 2,
      title: "Call Us",
      subtitle: "+234 123 456 7890",
      icon: "call",
      action: () => Linking.openURL('tel:+2341234567890')
    },
    {
      id: 3,
      title: "WhatsApp",
      subtitle: "Chat with us on WhatsApp",
      icon: "logo-whatsapp",
      action: () => Linking.openURL('https://wa.me/2341234567890')
    },
    {
      id: 4,
      title: "Live Chat",
      subtitle: "Coming soon",
      icon: "chatbubbles",
      action: () => Alert.alert('Coming Soon', 'Live chat will be available in the next update!')
    }
  ];

  const renderFAQ = (faq) => (
    <View key={faq.id} style={styles(colors).faqCard}>
      <TouchableOpacity
        style={styles(colors).faqHeader}
        onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
      >
        <Text style={styles(colors).faqQuestion}>{faq.question}</Text>
        <Ionicons 
          name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      
      {expandedFAQ === faq.id && (
        <View style={styles(colors).faqAnswer}>
          <Text style={styles(colors).faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );

  const renderContactOption = (option) => (
    <TouchableOpacity
      key={option.id}
      style={styles(colors).contactCard}
      onPress={option.action}
      activeOpacity={0.7}
    >
      <View style={styles(colors).contactIcon}>
        <Ionicons name={option.icon} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).contactContent}>
        <Text style={styles(colors).contactTitle}>{option.title}</Text>
        <Text style={styles(colors).contactSubtitle}>{option.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity 
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Help Center</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView style={styles(colors).scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles(colors).welcomeSection}>
          <Text style={styles(colors).welcomeTitle}>How can we help you?</Text>
          <Text style={styles(colors).welcomeSubtitle}>
            Find answers to common questions or contact our support team
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
          <View style={styles(colors).quickActions}>
            <TouchableOpacity 
              style={styles(colors).quickActionCard}
              onPress={() => navigation.navigate('Orders')}
            >
              <Ionicons name="bag" size={24} color={colors.primary} />
              <Text style={styles(colors).quickActionText}>Track Order</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles(colors).quickActionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person" size={24} color={colors.primary} />
              <Text style={styles(colors).quickActionText}>My Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles(colors).quickActionCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings" size={24} color={colors.primary} />
              <Text style={styles(colors).quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map(renderFAQ)}
        </View>

        {/* Contact Support */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Contact Support</Text>
          <Text style={styles(colors).sectionSubtitle}>
            Can't find what you're looking for? Reach out to us directly
          </Text>
          {contactOptions.map(renderContactOption)}
        </View>

        {/* Additional Resources */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Additional Resources</Text>
          
          <TouchableOpacity style={styles(colors).resourceCard}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <View style={styles(colors).resourceContent}>
              <Text style={styles(colors).resourceTitle}>Terms of Service</Text>
              <Text style={styles(colors).resourceSubtitle}>Read our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles(colors).resourceCard}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <View style={styles(colors).resourceContent}>
              <Text style={styles(colors).resourceTitle}>Privacy Policy</Text>
              <Text style={styles(colors).resourceSubtitle}>Learn how we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles(colors).resourceCard} onPress={handleReplayTutorial}>
            <Ionicons name="play-circle" size={20} color={colors.primary} />
            <View style={styles(colors).resourceContent}>
              <Text style={styles(colors).resourceTitle}>Replay Tutorial</Text>
              <Text style={styles(colors).resourceSubtitle}>Show the welcome guide again</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  faqCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 15,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqAnswerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 15,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resourceContent: {
    flex: 1,
    marginLeft: 15,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  resourceSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: 120,
  },
});

export default HelpCenterScreen;