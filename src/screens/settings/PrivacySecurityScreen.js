// src/screens/settings/PrivacySecurityScreen.js - Privacy & Security Settings
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, THEME } from '../../utils/colors';
import StandardHeader from '../../components/layout/Header';
import apiService from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../styles/theme';

const PrivacySecurityScreen = ({ navigation }) => {
  const { user, deleteAccount } = useAuth();
  const { colors } = useTheme();
  const { showError, showInfo, showConfirm } = useAlert();
  const [loading, setLoading] = useState(true);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'private', // 'public', 'friends', 'private'
    showEmail: false,
    showPhone: false,
    showActivity: false,
    allowDataCollection: true,
    marketingEmails: false,
    shareWithPartners: false,
    twoFactorAuth: false,
    biometricAuth: false, // Keep disabled as requested
    loginNotifications: true,
    locationTracking: false,
  });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const result = await apiService.getPrivacySettings?.();
      
      if (result?.success && result.data) {
        setPrivacySettings(prev => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      // Optimistically update UI
      setPrivacySettings(prev => ({ ...prev, [key]: value }));
      
      // Log activity
      await apiService.logUserActivity?.({
        action: 'privacy_setting_change',
        description: `Changed ${key} to ${value}`,
        timestamp: new Date().toISOString(),
        metadata: { screen: 'PrivacySecurityScreen', setting: key, newValue: value }
      });

      // Save to backend
      const result = await apiService.updatePrivacySettings?.({
        ...privacySettings,
        [key]: value
      });

      if (!result?.success) {
        // Revert on failure
        setPrivacySettings(prev => ({ ...prev, [key]: !value }));
        showError('Error', 'Failed to update privacy setting');
      }
    } catch (error) {
      // Revert on error
      setPrivacySettings(prev => ({ ...prev, [key]: !value }));
      console.error('Privacy setting update error:', error);
      showError('Error', 'Failed to update privacy setting');
    }
  };

  const handleDataExport = async () => {
    try {
      showConfirm(
        'Export Data',
        'We will prepare your data export and send it to your email address. This may take up to 24 hours.',
        async () => {
              try {
                setSaveLoading(true);
                
                await apiService.logUserActivity?.({
                  action: 'data_export_request',
                  description: 'Requested data export',
                  timestamp: new Date().toISOString(),
                  metadata: { screen: 'PrivacySecurityScreen' }
                });

                const result = await apiService.requestDataExport?.();
                
                if (result?.success) {
                  showInfo('Export Requested', 'Your data export has been requested. You will receive an email when it\'s ready.');
                } else {
                  showError('Export Failed', 'Unable to process data export request. Please try again.');
                }
              } catch (error) {
                showError('Error', 'Failed to request data export');
              } finally {
                setSaveLoading(false);
              }
        }
    } catch (error) {
      console.error('Data export error:', error);
    }
  };

  const handleDeleteAccount = () => {
    showConfirm(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.\n\nAre you sure you want to delete your account?',
      () => {
            showConfirm(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion',
              async () => {
                    try {
                      setSaveLoading(true);
                      await deleteAccount();
                    } catch (error) {
                      showError('Error', 'Failed to delete account. Please contact support.');
                    } finally {
                      setSaveLoading(false);
                    }
              }
            );
          }
  };

  const renderSettingRow = (title, subtitle, value, onToggle, type = 'switch') => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary }}
          disabled={saveLoading}
        />
      ) : (
        <TouchableOpacity onPress={onToggle} disabled={saveLoading}>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <StandardHeader 
        title="Privacy & Security"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderSection('Profile Privacy', [
            renderSettingRow(
              'Profile Visibility',
              'Control who can see your profile information',
              privacySettings.profileVisibility,
              () => {
                showInfo(
                  'Profile Visibility',
                  'Choose who can see your profile',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Public', onPress: () => updateSetting('profileVisibility', 'public') },
                    { text: 'Friends Only', onPress: () => updateSetting('profileVisibility', 'friends') },
                    { text: 'Private', onPress: () => updateSetting('profileVisibility', 'private') }
                  ]
                );
              },
              'arrow'
            ),
            renderSettingRow(
              'Show Email',
              'Allow others to see your email address',
              privacySettings.showEmail,
              (value) => updateSetting('showEmail', value)
            ),
            renderSettingRow(
              'Show Phone',
              'Allow others to see your phone number',
              privacySettings.showPhone,
              (value) => updateSetting('showPhone', value)
            ),
            renderSettingRow(
              'Show Activity',
              'Let others see your recent orders and activity',
              privacySettings.showActivity,
              (value) => updateSetting('showActivity', value)
            ),
          ])}

          {renderSection('Data & Privacy', [
            renderSettingRow(
              'Data Collection',
              'Allow us to collect usage data to improve the app',
              privacySettings.allowDataCollection,
              (value) => updateSetting('allowDataCollection', value)
            ),
            renderSettingRow(
              'Marketing Emails',
              'Receive promotional emails and offers',
              privacySettings.marketingEmails,
              (value) => updateSetting('marketingEmails', value)
            ),
            renderSettingRow(
              'Share with Partners',
              'Share anonymous data with our partners',
              privacySettings.shareWithPartners,
              (value) => updateSetting('shareWithPartners', value)
            ),
            renderSettingRow(
              'Location Tracking',
              'Allow location tracking for delivery optimization',
              privacySettings.locationTracking,
              (value) => updateSetting('locationTracking', value)
            ),
          ])}

          {renderSection('Security', [
            renderSettingRow(
              'Two-Factor Authentication',
              'Add an extra layer of security to your account',
              privacySettings.twoFactorAuth,
              (value) => updateSetting('twoFactorAuth', value)
            ),
            renderSettingRow(
              'Login Notifications',
              'Get notified when someone logs into your account',
              privacySettings.loginNotifications,
              (value) => updateSetting('loginNotifications', value)
            ),
          ])}

          {renderSection('Data Management', [
            <TouchableOpacity 
              key="export" 
              style={styles.actionButton} 
              onPress={handleDataExport}
              disabled={saveLoading}
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Export My Data</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>,
            
            <TouchableOpacity 
              key="delete" 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={handleDeleteAccount}
              disabled={saveLoading}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ])}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Privacy Policy</Text>
            <Text style={styles.infoText}>
              We respect your privacy and are committed to protecting your personal data. 
              Read our full privacy policy to understand how we collect, use, and protect your information.
            </Text>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>View Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 15,
  },
  dangerText: {
    color: colors.error,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default PrivacySecurityScreen;