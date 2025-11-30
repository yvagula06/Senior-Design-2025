import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryStackParamList } from './types';
import { HistoryListScreen } from '../screens/History/HistoryListScreen';
import { HistoryDetailScreen } from '../screens/History/HistoryDetailScreen';
import { AppColors } from '../theme/colors';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export const HistoryStackNavigator: React.FC = () => {
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
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen
        name="HistoryList"
        component={HistoryListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{ title: 'Dish Details' }}
      />
    </Stack.Navigator>
  );
};
