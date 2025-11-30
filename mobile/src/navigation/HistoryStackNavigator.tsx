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
      }}
    >
      <Stack.Screen
        name="HistoryList"
        component={HistoryListScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{ title: 'Dish Details' }}
      />
    </Stack.Navigator>
  );
};
