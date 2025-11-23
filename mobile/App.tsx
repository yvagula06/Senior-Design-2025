import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { FoodProvider } from './src/context/FoodContext';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { theme } from './src/theme/colors';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <FoodProvider>
        <NavigationContainer>
          <BottomTabNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </FoodProvider>
    </PaperProvider>
  );
}
