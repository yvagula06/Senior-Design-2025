import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

interface VariantDrawerButtonProps {
  onPress: () => void;
  variantCount?: number;
}

export const VariantDrawerButton: React.FC<VariantDrawerButtonProps> = ({
  onPress,
  variantCount = 3,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color={AppColors.accent}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>View assumptions and variants</Text>
          <Text style={styles.subtitle}>
            {variantCount} ingredient variations available
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={AppColors.mediumGray}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
    ...Shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.darkGray,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.mediumGray,
  },
});
