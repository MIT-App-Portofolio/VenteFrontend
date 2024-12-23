import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import Auth from './auth';
import { StatusBar } from 'expo-status-bar';
import { CenterAligned, ErrorText } from '@/components/ThemedComponents';
import { ApiProvider, AuthResult, useApi } from '../api';

export default function RootLayout() {
  return (
    <ApiProvider>
      <Inner></Inner>
    </ApiProvider>
  )
}

function Inner() {
  const [loadingAuthStatus, setLoading] = useState(true);
  const api = useApi();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [unkownError, setUnkownError] = useState(false);

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
