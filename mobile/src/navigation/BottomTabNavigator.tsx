import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AddEntryScreen } from '../screens/AddEntryScreen';
import { DailyConsumerScreen } from '../screens/DailyConsumerScreen';
import { AppColors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.accent,
        tabBarInactiveTintColor: AppColors.mediumGray,
        tabBarStyle: {
          backgroundColor: AppColors.white,
          borderTopColor: AppColors.lightGray,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{
          tabBarLabel: 'Add Entry',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-box" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DailyConsumer"
        component={DailyConsumerScreen}
        options={{
          tabBarLabel: 'Daily Consumer',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
