import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TextInput } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme as LightNavTheme } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, CrimsonPro_300Light, CrimsonPro_400Regular, CrimsonPro_600SemiBold, CrimsonPro_700Bold } from '@expo-google-fonts/crimson-pro';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { RootTabNavigator } from './src/navigation/RootTabNavigator';
import { theme } from './src/theme/colors';
import { FoodProvider } from './src/context/FoodContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Inner component so it can consume ThemeContext for dynamic nav theme
function AppInner({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDark } = useAppTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : LightNavTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : LightNavTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.cardBackground,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  React.useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        try {
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

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={navigationTheme}>
          <RootTabNavigator />
          <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" />
        </NavigationContainer>
      </PaperProvider>
    </View>
  );
}

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FoodProvider>
            <AppInner fontsLoaded={fontsLoaded} />
          </FoodProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

