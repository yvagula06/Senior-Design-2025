import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const renderRight = () => {
    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value as boolean}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={value ? colors.background : colors.text}
          />
        );
      case 'select':
        return (
          <View style={styles.selectContainer}>
            <Text style={styles.selectValue}>{value as string}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        );
      case 'info':
        return (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.textSecondary}
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
          <MaterialCommunityIcons name={icon} size={22} color={colors.accent} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {renderRight()}
    </Container>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  label: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    color: colors.text,
    flex: 1,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: colors.textSecondary,
    marginRight: Spacing.xs,
  },
  });
}

