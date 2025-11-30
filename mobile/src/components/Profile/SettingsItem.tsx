import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius } from '../../theme';

interface SettingsItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  type: 'toggle' | 'select' | 'info';
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  label,
  type,
  value,
  onPress,
  onToggle,
}) => {
  const renderRight = () => {
    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value as boolean}
            onValueChange={onToggle}
            trackColor={{ false: AppColors.border, true: AppColors.accent }}
            thumbColor={value ? AppColors.background : AppColors.text}
          />
        );
      case 'select':
        return (
          <View style={styles.selectContainer}>
            <Text style={styles.selectValue}>{value as string}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={AppColors.textSecondary}
            />
          </View>
        );
      case 'info':
        return (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={AppColors.textSecondary}
          />
        );
      default:
        return null;
    }
  };

  const Container = type === 'info' || type === 'select' ? TouchableOpacity : View;

  return (
    <Container
      style={styles.container}
      onPress={type === 'info' || type === 'select' ? onPress : undefined}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={22} color={AppColors.accent} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {renderRight()}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: AppColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  label: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.text,
    flex: 1,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: AppColors.textSecondary,
    marginRight: Spacing.xs,
  },
});
