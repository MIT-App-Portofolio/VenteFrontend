import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import Auth from './auth';
import { StatusBar } from 'expo-status-bar';
import { CenterAligned, ErrorText, FullScreenLoading } from '@/components/ThemedComponents';
import { ApiProvider, AuthResult, useApi } from '../api';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { RedirectProvider } from '@/context/RedirectContext';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  return (
    <ApiProvider>
      <RedirectProvider>
        <Inner></Inner>
      </RedirectProvider>
    </ApiProvider>
  )
}

function Inner() {
  const [loadingAuthStatus, setLoading] = useState(true);
  const api = useApi();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [unkownError, setUnkownError] = useState(false);
  const [fontsLoaded] = useFonts({
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const inner = async () => {
      setLoading(true);

      var ok = await api.getLocations();
      if (!ok) {
        setUnkownError(true);
      }

      var auth = await api.getUserInfo();
      if (auth == AuthResult.UnkownError) {
        setUnkownError(true);
      } else {
        setAuthenticated(auth == AuthResult.Authenticated);
      }

      setLoading(false);
    };
    inner();
  }, []);

  if (unkownError) {
    return (
      <CenterAligned>
        <ErrorText>No fue posible contactar con los servidores de VoyA. Reinicie la app.</ErrorText>
      </CenterAligned>
    )
  }

  if (loadingAuthStatus || !fontsLoaded) {
    return <FullScreenLoading />;
  }

  if (!isAuthenticated) {
    return (
      <CenterAligned>
        <Auth onLogin={() => setAuthenticated(true)} />
      </CenterAligned>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
