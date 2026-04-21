import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface CategoryHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onSeeAllPress?: () => void;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  title,
  subtitle,
  icon,
  onSeeAllPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {icon && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon as any}
              size={24}
              color={colors.accent}
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {onSeeAllPress && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAllPress}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={colors.accent}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.accent,
    marginRight: Spacing.xs / 2,
  },
  });
}

