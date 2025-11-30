import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, CrimsonPro_300Light, CrimsonPro_400Regular, CrimsonPro_600SemiBold, CrimsonPro_700Bold } from '@expo-google-fonts/crimson-pro';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { RootTabNavigator } from './src/navigation/RootTabNavigator';
import { theme, AppColors } from './src/theme/colors';
import { FoodProvider } from './src/context/FoodContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppColors.primary,
    background: AppColors.background,
    card: AppColors.cardBackground,
    text: AppColors.text,
    border: AppColors.border,
    notification: AppColors.accent,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    CrimsonPro_300Light,
    CrimsonPro_400Regular,
    CrimsonPro_600SemiBold,
    CrimsonPro_700Bold,
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  React.useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        try {
          // Override default Text render to use Space Grotesk
          const TextRender = Text.render;
          const TextInputRender = TextInput.render;
          
          Text.render = function (props: any, ref: any) {
            return TextRender.call(this, {
              ...props,
              style: [{ fontFamily: 'SpaceGrotesk_400Regular' }, props.style],
            }, ref);
          };
          
          TextInput.render = function (props: any, ref: any) {
            return TextInputRender.call(this, {
              ...props,
              style: [{ fontFamily: 'SpaceGrotesk_400Regular' }, props.style],
            }, ref);
          };
          
          console.log('✅ Font configuration applied - Space Grotesk & Crimson Pro loaded');
        } catch (e) {
          console.warn('Error configuring fonts:', e);
        } finally {
          await SplashScreen.hideAsync();
        }
      }
    }
    
    prepare();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <FoodProvider>
          <PaperProvider theme={theme}>
            <NavigationContainer theme={navigationTheme}>
              <RootTabNavigator />
              <StatusBar style="light" backgroundColor="#9c1818ff" />
            </NavigationContainer>
          </PaperProvider>
        </FoodProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
