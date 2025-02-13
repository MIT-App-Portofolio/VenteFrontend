import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import Auth from './auth';
import { StatusBar } from 'expo-status-bar';
import { ErrorText } from '@/components/ThemedText';
import { CenterAligned } from '@/components/CenterAligned';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { ApiProvider, AuthResult, useApi } from '../api';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { RedirectProvider } from '@/context/RedirectContext';
import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import messaging from '@react-native-firebase/messaging';
import InviteScreen from './invite';
import { AppState } from 'react-native';

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
  const { api, inviteStatus } = useApi();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [unknownError, setUnknownError] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold
  });
  const [appState, setAppState] = useState(AppState.currentState);

  // Notification setup
  useEffect(() => {
    const inner = async () => {
      await messaging().requestPermission();
      messaging().onTokenRefresh(async (token) => {
        await api.sendNotificationToken(token);
      });
      messaging().onMessage(async (_) => {
        // For now, the only notifications are the invite ones, so no need to handle other types.
        // This will also obviously refresh the app if the invite status is different triggering the proper popup.
        await api.getInviteStatus();
      });

      // This is needed to handle the unique case where a user has recently closed the app, 
      // received an invite notification and reopened it, so we didn't have the time to rerender from 
      // start and we need to check the invite status once again.
      AppState.addEventListener('change', async (nextAppState) => {
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
          await api.getInviteStatus();
        }
        setAppState(nextAppState);
      });
    };

    inner();
  }, []);

  useEffect(() => {
    const inner = async () => {
      setLoading(true);

      var ok = await api.getLocations();
      if (!ok) {
        setUnknownError(true);
      }

      var auth = await api.getUserInfo();
      if (auth == AuthResult.UnknownError) {
        setUnknownError(true);
      } else {
        setAuthenticated(auth == AuthResult.Authenticated);
      }

      setLoading(false);
    };
    inner();
  }, []);

  if (unknownError) {
    return (
      <CenterAligned>
        <ErrorText>No fue posible contactar con los servidores de Vente. Reinicie la app.</ErrorText>
      </CenterAligned>
    )
  }

  if (loadingAuthStatus || !fontsLoaded) {
    return <FullScreenLoading />;
  }

  if (!isAuthenticated) {
    return (
      <CenterAligned>
        <Auth onLogin={async () => {
          await api.sendNotificationToken(await messaging().getToken());
          setAuthenticated(true)
        }} />
      </CenterAligned>
    );
  }

  if (inviteStatus?.invited) {
    return (
      <CenterAligned>
        <InviteScreen />
      </CenterAligned>
    )
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
