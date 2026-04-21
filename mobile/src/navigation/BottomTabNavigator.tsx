import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AddEntryScreen } from '../screens/AddEntryScreen';
import { DailyConsumerScreen } from '../screens/DailyConsumerScreen';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mediumGray,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.lightGray,
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
