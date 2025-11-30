import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootTabParamList } from './types';
import { LabelStackNavigator } from './LabelStackNavigator';
import { HistoryStackNavigator } from './HistoryStackNavigator';
import { ExploreScreen, ProfileScreen } from '../screens';
import { AppColors } from '../theme/colors';

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
          headerShown: true,
          headerStyle: {
            backgroundColor: AppColors.cardBackground,
            borderBottomColor: AppColors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: AppColors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: AppColors.text,
          },
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
          headerShown: true,
          headerStyle: {
            backgroundColor: AppColors.cardBackground,
            borderBottomColor: AppColors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: AppColors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: AppColors.text,
          },
        }}
      />
    </Tab.Navigator>
  );
};
