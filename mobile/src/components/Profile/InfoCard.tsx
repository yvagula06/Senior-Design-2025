import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface InfoCardProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({ icon, title, description }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={28} color={colors.accent} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

type C = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: C) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      ...Shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 50,
      height: 50,
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
      fontFamily: 'CrimsonPro_600SemiBold',
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    description: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.regular,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
}
