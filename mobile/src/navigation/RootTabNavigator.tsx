import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Easing } from 'react-native';
import { RootTabParamList } from './types';
import { LabelStackNavigator } from './LabelStackNavigator';
import { HistoryStackNavigator } from './HistoryStackNavigator';
import { ExploreScreen, ProfileScreen } from '../screens';
import { AppColors, Spacing } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.accent,
        tabBarInactiveTintColor: AppColors.textTertiary,
        tabBarStyle: {
          backgroundColor: AppColors.cardBackground,
          borderTopColor: AppColors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
          paddingTop: Spacing.sm,
          height: Platform.OS === 'ios' ? 85 : 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        animation: 'fade',
      }}
    >
      <Tab.Screen
        name="LabelStack"
        component={LabelStackNavigator}
        options={{
          tabBarLabel: 'Label',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryStack"
        component={HistoryStackNavigator}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};
