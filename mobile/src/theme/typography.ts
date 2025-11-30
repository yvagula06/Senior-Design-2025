import { Typography } from './constants';

/**
 * Get the appropriate Inter font family based on font weight
 * This ensures we use the correct font weight variant
 */
export const getFontFamily = (weight?: keyof typeof Typography.fontWeight): string => {
  switch (weight) {
    case 'light':
      return Typography.fontFamily.light;
    case 'medium':
      return Typography.fontFamily.medium;
    case 'semibold':
      return Typography.fontFamily.semibold;
    case 'bold':
      return Typography.fontFamily.bold;
    case 'extrabold':
      return Typography.fontFamily.extrabold;
    case 'regular':
    default:
      return Typography.fontFamily.regular;
  }
};

/**
 * Create a text style with proper font family and weight
 */
export const createTextStyle = (options: {
  fontSize?: number;
  fontWeight?: keyof typeof Typography.fontWeight;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
}) => {
  const { fontSize, fontWeight = 'regular', lineHeight, letterSpacing, color } = options;
  
  return {
    fontFamily: getFontFamily(fontWeight),
    ...(fontSize && { fontSize }),
    ...(lineHeight && { lineHeight }),
    ...(letterSpacing && { letterSpacing }),
    ...(color && { color }),
  };
};
