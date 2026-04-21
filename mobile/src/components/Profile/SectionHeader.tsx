import React, { useMemo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]); title }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  });
}

