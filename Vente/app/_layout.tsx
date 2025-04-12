import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import Auth from './auth';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { ErrorText } from '@/components/ThemedText';
import { CenterAligned } from '@/components/CenterAligned';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { ApiProvider, AuthResult, useApi } from '../api';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import messaging from '@react-native-firebase/messaging';
import InviteScreen from './invite';
import { AppState, Platform, View } from 'react-native';
import emitter from '@/eventEmitter';
import Affiliate from './affiliate';

export default function RootLayout() {
  return (
    <ApiProvider>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Inner></Inner>
      </View>
    </ApiProvider>
  )
}

function Inner() {
  const [loadingAuthStatus, setLoading] = useState(true);
  const { api, inviteStatus } = useApi();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [unknownError, setUnknownError] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold
  });
  const [appState, setAppState] = useState(AppState.currentState);

  // Notification setup
  useEffect(() => {
    const inner = async () => {
      if (Platform.OS == 'ios') {
        await messaging().requestPermission();
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      }

      messaging().onTokenRefresh(async (token) => {
        await api.sendNotificationToken(token);
      });
      messaging().onMessage(async (notification) => {
        if (notification.data) {
          switch (notification.data.notification_type) {
            case "invite":
              await api.getInviteStatus();
              break;
            case "offer":
              await api.getCustomOffers();
              break;
            default:
              break;
          }
        }
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
        if (auth == AuthResult.Authenticated) {
          const affiliateStatus = await api.isAffiliate();
          setIsAffiliate(affiliateStatus);
        }
      }

      setLoading(false);
    };
    inner();
    emitter.on('logout', inner);
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
          if (await messaging().hasPermission()) {
            await api.sendNotificationToken(await messaging().getToken());
          }
          setAuthenticated(true)
        }} />
        <StatusBar translucent backgroundColor="transparent" style='light' />
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

  console.log(isAffiliate);

  if (isAffiliate) {
    return (
      <View style={{ flex: 1 }}>
        <Affiliate />
        <StatusBar translucent backgroundColor="transparent" style='light' />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar translucent backgroundColor="transparent" style='light' />
    </ThemeProvider>
  );
}
