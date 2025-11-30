import { Text, TextInput, StyleSheet } from 'react-native';

/**
 * Configure default font family for all Text and TextInput components
 * Uses Space Grotesk for a unique, modern yet sophisticated look
 */
export const configureDefaultFonts = () => {
  // Create default font style
  const defaultFontFamily = 'SpaceGrotesk_400Regular';
  
  // Override Text defaultProps
  (Text as any).defaultProps = {
    ...(Text as any).defaultProps,
    allowFontScaling: false,
  };

  // Override TextInput defaultProps
  (TextInput as any).defaultProps = {
    ...(TextInput as any).defaultProps,
    allowFontScaling: false,
  };

  // Add font family to default style
  const oldTextRender = (Text as any).render;
  const oldTextInputRender = (TextInput as any).render;

  if (oldTextRender) {
    (Text as any).render = function (props: any, ref: any) {
      return oldTextRender.call(this, {
        ...props,
        style: StyleSheet.flatten([{ fontFamily: defaultFontFamily }, props.style]),
      }, ref);
    };
  }

  if (oldTextInputRender) {
    (TextInput as any).render = function (props: any, ref: any) {
      return oldTextInputRender.call(this, {
        ...props,
        style: StyleSheet.flatten([{ fontFamily: defaultFontFamily }, props.style]),
      }, ref);
    };
  }
};
