import { Animated, Easing } from 'react-native';

/**
 * Animation Configurations
 * Reusable animation presets for consistent motion throughout the app
 */

export const AnimationDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
};

export const AnimationEasing = {
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  spring: Easing.elastic(1),
  bounce: Easing.bounce,
  bezier: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/**
 * Fade In Animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationDuration.normal,
  delay: number = 0
) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Fade Out Animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationDuration.normal
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationEasing.easeIn,
    useNativeDriver: true,
  });
};

/**
 * Slide In Animation
 */
export const slideIn = (
  animatedValue: Animated.Value,
  from: number,
  duration: number = AnimationDuration.normal,
  delay: number = 0
) => {
  animatedValue.setValue(from);
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    delay,
    easing: AnimationEasing.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Scale In Animation
 */
export const scaleIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationDuration.normal,
  delay: number = 0
) => {
  animatedValue.setValue(0.8);
  return Animated.spring(animatedValue, {
    toValue: 1,
    friction: 8,
    tension: 40,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Pulse Animation
 */
export const pulse = (animatedValue: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.05,
      duration: AnimationDuration.fast,
      easing: AnimationEasing.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: AnimationDuration.fast,
      easing: AnimationEasing.easeIn,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Shake Animation
 */
export const shake = (animatedValue: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

/**
 * Staggered Fade In
 * For animating lists of items
 */
export const staggeredFadeIn = (
  animatedValues: Animated.Value[],
  staggerDelay: number = 50
) => {
  return Animated.stagger(
    staggerDelay,
    animatedValues.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: AnimationDuration.normal,
        easing: AnimationEasing.easeOut,
        useNativeDriver: true,
      })
    )
  );
};

/**
 * Loading Shimmer Animation
 */
export const shimmer = (animatedValue: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ])
  );
};
