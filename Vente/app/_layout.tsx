import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import Auth from './auth';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { ErrorText, ThemedText } from '@/components/ThemedText';
import { CenterAligned } from '@/components/CenterAligned';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { ApiProvider, AuthResult, useApi } from '../api';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import messaging from '@react-native-firebase/messaging';
import { AppState, Platform, View } from 'react-native';
import emitter from '@/eventEmitter';
import Affiliate from './affiliate';
import { IconSymbol } from '@/components/ui/IconSymbol';

const toastConfig = {
  error: (props: any) => (
    <View style={{
      backgroundColor: '#2A2A2A',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      marginHorizontal: 20,
      marginTop: 40,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <IconSymbol name="xmark.circle.fill" color="red" size={20} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <ThemedText type="subtitle" style={{ fontSize: 14 }}>{props.text1}</ThemedText>
        <ThemedText style={{ fontSize: 12 }}>{props.text2}</ThemedText>
      </View>
    </View>
  ),
};

export default function RootLayout() {
  return (
    <ApiProvider>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Inner></Inner>
        <Toast config={toastConfig} />
      </View>
    </ApiProvider>
  )
}

function Inner() {
  const [loadingAuthStatus, setLoading] = useState(true);
  const { api } = useApi();
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
              await api.getInvitationExits();
              break;
            case "invite_accept":
              await api.getExits();
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
          await api.getInvitationExits();
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
          await api.getExits();
          await api.getInvitationExits();
          await api.exitAlbumAvailable();
          await api.getMessageSummaries();
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
