import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExploreStackParamList } from './types';
import { ExploreScreen } from '../screens/ExploreScreen';
import { CameraCaptureScreen } from '../screens/Vision/CameraCaptureScreen';
import { EstimationResultScreen } from '../screens/Vision/EstimationResultScreen';
import { useAppTheme } from '../context/ThemeContext';
import type { ExploreStackNavigationProp } from './types';

function BackButton() {
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ExploreHome')}
      style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export const ExploreStackNavigator: React.FC = () => {
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
        name="ExploreHome"
        component={ExploreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CameraCapture"
        component={CameraCaptureScreen}
        options={{title: 'Camera Estimate', headerLeft: () => <BackButton />}}
      />
      <Stack.Screen
        name="EstimationResult"
        component={EstimationResultScreen}
        options={{ title: 'Estimation Result' }}
      />
    </Stack.Navigator>
  );
};

