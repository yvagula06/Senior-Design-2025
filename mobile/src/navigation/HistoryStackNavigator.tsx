import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryStackParamList } from './types';
import { HistoryListScreen } from '../screens/History/HistoryListScreen';
import { HistoryDetailScreen } from '../screens/History/HistoryDetailScreen';
import { useAppTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export const HistoryStackNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(() => ({
    headerStyle: { backgroundColor: colors.cardBackground },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: 'bold' as const, color: colors.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    animation: 'slide_from_right' as const,
    animationDuration: 300,
  }), [colors]);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="HistoryList"
        component={HistoryListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{
          title: 'Dish Details',
          headerBackTitle: 'HistoryList',
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack.Navigator>
  );
};
