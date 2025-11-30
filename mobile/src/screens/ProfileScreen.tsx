import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsItem, SectionHeader, InfoCard } from '../components/Profile';
import { AppColors, Spacing, Typography, BorderRadius } from '../theme';
import { loadSettings, saveSettings } from '../services/storage';

type UnitSystem = 'imperial' | 'metric';
type DefaultStyle = 'home' | 'restaurant' | 'ask';

export const ProfileScreen: React.FC = () => {
  const [useMetric, setUseMetric] = useState(false);
  const [defaultStyle, setDefaultStyle] = useState<DefaultStyle>('ask');
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user settings from AsyncStorage on mount
   * 
   * Settings are persisted locally for quick access
   * TODO: Sync with backend for multi-device support
   */
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const settings = await loadSettings();
      setUseMetric(settings.useMetric);
      setDefaultStyle(settings.defaultPrepStyle);
      console.log('✅ [Profile] Settings loaded:', settings);
    } catch (error) {
      console.error('❌ [Profile] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle units preference and persist to storage
   * 
   * TODO: Apply units throughout the app
   * - Update nutrition display in Label tab
   * - Update History entries display
   * - Convert between imperial/metric as needed
   */
  const handleUnitToggle = async (value: boolean) => {
    setUseMetric(value);
    try {
      await saveSettings({ useMetric: value });
      console.log('✅ [Profile] Units preference saved:', value ? 'Metric' : 'Imperial');
    } catch (error) {
      console.error('❌ [Profile] Failed to save units preference:', error);
    }
  };

  /**
   * Update default meal style and persist to storage
   * 
   * TODO: Use this setting in Label screen
   * - Pre-select style based on user preference
   * - Skip style selection if set to home/restaurant
   * - Only show picker if set to 'ask'
   */
  const handleStyleSelect = async (style: DefaultStyle) => {
    setDefaultStyle(style);
    setStyleModalVisible(false);
    try {
      await saveSettings({ defaultPrepStyle: style });
      console.log('✅ [Profile] Default style saved:', style);
    } catch (error) {
      console.error('❌ [Profile] Failed to save default style:', error);
    }
  };

  const handleAboutPress = () => {
    Alert.alert(
      'About NutriLabelAI',
      'NutriLabelAI is an intelligent nutrition analysis app that helps you understand the nutritional content of your meals.\n\nVersion 1.0.0\nDeveloped by Senior Design Team 2025',
      [{ text: 'OK' }]
    );
  };

  const getStyleLabel = () => {
    switch (defaultStyle) {
      case 'home':
        return 'Home Cooked';
      case 'restaurant':
        return 'Restaurant';
      case 'ask':
        return 'Ask Every Time';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-circle" size={80} color={AppColors.accent} />
          </View>
          <Text style={styles.userName}>User Profile</Text>
          <Text style={styles.userSubtitle}>Manage your preferences</Text>
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="ruler"
            label="Units"
            type="toggle"
            value={useMetric}
            onToggle={handleUnitToggle}
          />
          <SettingsItem
            icon="chef-hat"
            label="Default Meal Style"
            type="select"
            value={getStyleLabel()}
            onPress={() => setStyleModalVisible(true)}
          />
        </View>

        {/* About Section */}
        <SectionHeader title="About" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="information"
            label="About NutriLabelAI"
            type="info"
            onPress={handleAboutPress}
          />
        </View>

        {/* Model Info Section */}
        <SectionHeader title="How It Works" />
        <InfoCard
          icon="database"
          title="Smart Recipe Database"
          description="We use PostgreSQL with pgvector extension to store and search through thousands of recipes efficiently using semantic embeddings."
        />
        <InfoCard
          icon="brain"
          title="AI-Powered Analysis"
          description="Our machine learning model analyzes dish descriptions and uses vector similarity search to find the best matching recipes for accurate nutrition estimation."
        />
        <InfoCard
          icon="chart-box"
          title="Confidence Scoring"
          description="Every nutrition estimate comes with a confidence score based on recipe similarity, helping you understand the reliability of the analysis."
        />

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NutriLabelAI v1.0.0</Text>
          <Text style={styles.footerSubtext}>Senior Design Project 2025</Text>
        </View>
      </ScrollView>

      {/* Style Selection Modal */}
      <Modal
        visible={styleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStyleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Default Meal Style</Text>
              <TouchableOpacity onPress={() => setStyleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.modalOption,
                defaultStyle === 'home' && styles.modalOptionSelected,
              ]}
              onPress={() => handleStyleSelect('home')}
            >
              <MaterialCommunityIcons
                name="home"
                size={24}
                color={defaultStyle === 'home' ? AppColors.accent : AppColors.textSecondary}
              />
              <View style={styles.modalOptionText}>
                <Text style={[
                  styles.modalOptionTitle,
                  defaultStyle === 'home' && styles.modalOptionTitleSelected,
                ]}>
                  Home Cooked
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Analyze dishes as homemade meals
                </Text>
              </View>
              {defaultStyle === 'home' && (
                <MaterialCommunityIcons name="check-circle" size={24} color={AppColors.accent} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                defaultStyle === 'restaurant' && styles.modalOptionSelected,
              ]}
              onPress={() => handleStyleSelect('restaurant')}
            >
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={24}
                color={defaultStyle === 'restaurant' ? AppColors.accent : AppColors.textSecondary}
              />
              <View style={styles.modalOptionText}>
                <Text style={[
                  styles.modalOptionTitle,
                  defaultStyle === 'restaurant' && styles.modalOptionTitleSelected,
                ]}>
                  Restaurant
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Analyze dishes as restaurant meals
                </Text>
              </View>
              {defaultStyle === 'restaurant' && (
                <MaterialCommunityIcons name="check-circle" size={24} color={AppColors.accent} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                defaultStyle === 'ask' && styles.modalOptionSelected,
              ]}
              onPress={() => handleStyleSelect('ask')}
            >
              <MaterialCommunityIcons
                name="help-circle"
                size={24}
                color={defaultStyle === 'ask' ? AppColors.accent : AppColors.textSecondary}
              />
              <View style={styles.modalOptionText}>
                <Text style={[
                  styles.modalOptionTitle,
                  defaultStyle === 'ask' && styles.modalOptionTitleSelected,
                ]}>
                  Ask Every Time
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Choose style for each analysis
                </Text>
              </View>
              {defaultStyle === 'ask' && (
                <MaterialCommunityIcons name="check-circle" size={24} color={AppColors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    backgroundColor: AppColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  userName: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  userSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.textSecondary,
  },
  settingsGroup: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  footerSubtext: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalOptionSelected: {
    backgroundColor: AppColors.background,
  },
  modalOptionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  modalOptionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.text,
    marginBottom: 4,
  },
  modalOptionTitleSelected: {
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.accent,
  },
  modalOptionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.textSecondary,
  },
});
