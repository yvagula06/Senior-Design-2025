import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  containerStyle?: ViewStyle;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  style,
  ...props
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={colors.mediumGray}
            style={styles.icon}
          />
        )}
        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.mediumGray}
          {...props}
        />
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.darkGray,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  });
}


