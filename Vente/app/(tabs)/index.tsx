import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { CenterAligned } from '@/components/CenterAligned';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { dateShortDisplay } from '@/dateDisplay';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { BtnPrimary } from '@/components/Buttons';

export const pfpSize = 250;

export default function Users() {
  const router = useRouter();
  const { api, userProfile } = useApi();

  if (!userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <ThemedText>No estas registrado en ningún evento.</ThemedText>
        <BtnPrimary title='Ir al calendario' onClick={() => router.push('/calendar')} />
      </CenterAligned>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type='subtitle'>Vas a {api.getOwnLocationName(userProfile)} el {dateShortDisplay(userProfile.eventStatus.time!)}</ThemedText>

      <TouchableOpacity
        style={[styles.button, styles.fullWidthButton]}
        onPress={() => router.push('/places')}
      >
        <Feather name="map-pin" size={24} color="white" />
        <ThemedText style={styles.buttonText}>Discotecas</ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.halfWidthButton]}
          onPress={() => router.push('/users')}
        >
          <IconSymbol name="person" color="white" size={24} />
          <ThemedText style={styles.buttonText}>Otros usuarios</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.halfWidthButton]}
          onPress={() => router.push('/offers')}
        >
          <FontAwesome5 name="glass-martini-alt" color="white" size={24} />
          {/* <Feather name="tag" color="white" size={24} /> */}
          <ThemedText style={styles.buttonText}>Ofertas</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
    padding: 20,
    justifyContent: 'center',
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  fullWidthButton: {
    width: '100%',
  },
  halfWidthButton: {
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});