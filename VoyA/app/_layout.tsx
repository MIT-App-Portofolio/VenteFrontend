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
import { CenterAligned, ErrorText } from '@/components/ThemedComponents';
import { isLoggedIn } from '../api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loadingAuthStatus, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [unkownError, setUnkownError] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const [err, auth] = await isLoggedIn();
      setAuthenticated(auth);
      setUnkownError(err);
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (unkownError) {
    return (
      <CenterAligned>
        <ErrorText>No fue posible contactar con los servidores de VoyA. Reinicie la app.</ErrorText>
      </CenterAligned>
    )
  }

  console.log(isAuthenticated);

  return (
    <CenterAligned>
      {(loadingAuthStatus) && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
      {(!loadingAuthStatus && !isAuthenticated) && (
        <View>
          <Auth onLogin={() => setAuthenticated(true)}></Auth>
        </View>
      )}
      {(!loadingAuthStatus && isAuthenticated) && (
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
