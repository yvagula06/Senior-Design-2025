import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { useAppTheme } from '../../context/ThemeContext';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  visible,
  message,
  type = 'success',
  duration = 2500,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(100);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'information';
  const iconColor = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.accent;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={styles.toast}>
        <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 360,
  },
  message: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  });
}


