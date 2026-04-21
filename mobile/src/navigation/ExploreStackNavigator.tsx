import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreStackParamList } from './types';
import { ExploreScreen } from '../screens/ExploreScreen';
import { CameraCaptureScreen } from '../screens/Vision/CameraCaptureScreen';
import { EstimationResultScreen } from '../screens/Vision/EstimationResultScreen';
import { useAppTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export const ExploreStackNavigator: React.FC = () => {
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
        name="ExploreHome"
        component={ExploreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CameraCapture"
        component={CameraCaptureScreen}
        options={{ title: 'Camera Estimate' }}
      />
      <Stack.Screen
        name="EstimationResult"
        component={EstimationResultScreen}
        options={{ title: 'Estimation Result' }}
      />
    </Stack.Navigator>
  );
};

