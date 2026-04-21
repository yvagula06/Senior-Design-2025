import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface VariantDrawerButtonProps {
  onPress: () => void;
  variantCount?: number;
}

export const VariantDrawerButton: React.FC<VariantDrawerButtonProps> = ({
  onPress,
  variantCount = 3,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color={colors.accent}
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
          color={colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
};

type C = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: C) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.accentLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
}
