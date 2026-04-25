import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LabelStackParamList } from './types';
import { LabelHomeScreen } from '../screens/Label/LabelHomeScreen';
import { LabelResultScreen } from '../screens/Label/LabelResultScreen';
import { BarcodeScannerScreen } from '../screens/Label/BarcodeScannerScreen';
import { useAppTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator<LabelStackParamList>();

export const LabelStackNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.cardBackground,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: colors.text,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen
        name="LabelHome"
        component={LabelHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LabelResult"
        component={LabelResultScreen}
        options={{ title: 'Nutrition Results' }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

