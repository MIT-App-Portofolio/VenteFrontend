import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import Config from 'react-native-config';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import Auth from './auth';
import { StatusBar } from 'expo-status-bar';
import { CenterAligned } from '@/components/ThemedComponents';
import { isLoggedIn } from './api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loadingAuthStatus, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  useEffect(() => {
    const checkAuth = async () => {
      setAuthenticated(await isLoggedIn());
      setLoading(false);
    }
    checkAuth();
  }, []);

  return (
    <CenterAligned>
      {(loadingAuthStatus || !fontsLoaded) && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
      {(!loadingAuthStatus && fontsLoaded && !isAuthenticated) && (
        <View>
          <Auth onLogin={() => setAuthenticated(true)}></Auth>
        </View>
      )}
      {(!loadingAuthStatus && fontsLoaded && isAuthenticated) && (
        <View>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </View>
      )}
    </CenterAligned >
  );
}
