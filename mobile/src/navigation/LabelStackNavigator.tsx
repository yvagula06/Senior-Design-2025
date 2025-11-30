import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LabelStackParamList } from './types';
import { LabelHomeScreen } from '../screens/Label/LabelHomeScreen';
import { LabelResultScreen } from '../screens/Label/LabelResultScreen';
import { AppColors } from '../theme/colors';

const Stack = createNativeStackNavigator<LabelStackParamList>();

export const LabelStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: AppColors.cardBackground,
        },
        headerTintColor: AppColors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: AppColors.text,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: AppColors.background,
        },
      }}
    >
      <Stack.Screen
        name="LabelHome"
        component={LabelHomeScreen}
        options={{ title: 'Label' }}
      />
      <Stack.Screen
        name="LabelResult"
        component={LabelResultScreen}
        options={{ title: 'Nutrition Results' }}
      />
    </Stack.Navigator>
  );
};
