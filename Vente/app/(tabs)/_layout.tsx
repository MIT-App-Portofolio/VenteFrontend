import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useApi } from '@/api';
import { RedirectHandler } from '@/redirect_storage';
import { Badge } from 'react-native-elements';

export default function TabLayout() {
  const { exitAlbumAvailable, api, incomingSolicitations } = useApi();

  // refresh every couple of seconds
  useEffect(() => {
    const interval = setInterval(() => {
      api.exitAlbumAvailable();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <RedirectHandler>
      <Tabs
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: 'white',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
              display: route.name === 'messages' ? 'none' : 'flex',
            },
            default: {
              display: route.name === 'messages' ? 'none' : 'flex',
            },
          }),
        })}>
        <Tabs.Screen
          name="index"
          options={{
            title: '',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="places"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            title: '',
            tabBarIcon: ({ color }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconSymbol size={28} name="person.2.fill" color={color} />
                {incomingSolicitations && incomingSolicitations.length > 0 && (
                  <Badge value={incomingSolicitations.length} containerStyle={{ position: 'absolute', top: -5, right: -5 }} badgeStyle={{ backgroundColor: 'red', borderWidth: 0 }} textStyle={{ color: 'white' }} status='error' />
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="offers"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="picture"
          options={exitAlbumAvailable ? {
            title: '',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera" color={color} />,
          } : {
            href: null
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: '',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: '',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={color} />,
          }}
        />
      </Tabs>
    </RedirectHandler>
  );
}
