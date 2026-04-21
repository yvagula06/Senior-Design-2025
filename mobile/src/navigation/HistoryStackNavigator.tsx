import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryStackParamList } from './types';
import { HistoryListScreen } from '../screens/History/HistoryListScreen';
import { HistoryDetailScreen } from '../screens/History/HistoryDetailScreen';
import { useAppTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export const HistoryStackNavigator: React.FC = () => {
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

