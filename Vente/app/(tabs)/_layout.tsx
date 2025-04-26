import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useApi } from '@/api';

export default function TabLayout() {
  const { exitAlbumAvailable, api } = useApi();

  // refresh every couple of seconds
  useEffect(() => {
    const interval = setInterval(() => {
      api.exitAlbumAvailable();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'white',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {
          },
        }),
      }}>
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
        name="offers"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="tag" color={color} />,
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
  );
}
