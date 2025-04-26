import { EventLocation } from '@/api';
import { useState, useRef } from 'react';
import { TouchableOpacity, ScrollView, View, ActivityIndicator, Image } from 'react-native';
import { BtnPrimary } from './Buttons';
import { MarginItem } from './MarginItem';
import { StyledModal } from './StyledModal';
import { ThemedText } from './ThemedText';
import * as Location from 'expo-location';
import * as geolib from 'geolib';
import { StyledTextInput } from './StyledInput';

export type StyledLocationPickerProps = {
  locations: EventLocation[];
  location: string | null;
  setLocation: (location: string) => void;
  setIsDirty: (dirty: boolean) => void;
};

export function StyledLocationPicker({ locations, location, setLocation, setIsDirty }: StyledLocationPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [allLocations, setAllLocations] = useState<EventLocation[]>(locations);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const hasSorted = useRef(false);

  const filteredLocations = allLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortLocations = async () => {
    if (isSorting || hasSorted.current) return;

    setTimeout(async () => {
      setIsSorting(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const { coords } = await Location.getCurrentPositionAsync({});
          const sorted = [...allLocations].sort((a, b) => {
            const distanceA = geolib.getDistance(coords, { latitude: a.latitude, longitude: a.longitude });
            const distanceB = geolib.getDistance(coords, { latitude: b.latitude, longitude: b.longitude });
            return distanceA - distanceB;
          });

          setAllLocations(sorted);
          hasSorted.current = true;
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setIsSorting(false);
      }
    }, 0);
  };

  return (
    <MarginItem>
      <BtnPrimary
        title={location != null ? locations.find(loc => loc.id == location)?.name! : 'Selecciona un lugar'}
        onClick={() => {
          setShowPicker(true);
          sortLocations();
        }}
      />

      {showPicker &&
        <StyledModal isModalVisible={showPicker} setIsModalVisible={(visible) => {
          setShowPicker(visible);
          setSearchQuery(''); // Reset search when closing modal
        }} noIncludeScrollView>
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
              <StyledTextInput
                placeholder="Buscar lugar..."
                value={searchQuery}
                setValue={setSearchQuery}
                onChangeText={setSearchQuery}
              />
              {isSorting && (
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 8 }}>
                  <ActivityIndicator size="small" color="white" />
                  <ThemedText style={{ marginLeft: 8 }}>Ordenando por proximidad...</ThemedText>
                </View>
              )}
            </View>
            <ScrollView style={{ flex: 1 }}>
              {filteredLocations?.map((l, _1, _2) =>
                <TouchableOpacity key={l.id} style={{ width: '100%', height: 100, borderRadius: 15, marginTop: 10 }} onPress={() => { setLocation(l.id); setShowPicker(false); setIsDirty(true); }}>
                  <Image source={{ uri: l.pictureUrl }} style={{ width: '100%', height: '100%', borderRadius: 15, opacity: 0.8 }} />
                  <ThemedText type='subtitle' style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    textTransform: 'uppercase'
                  }}>
                    {l.name}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </StyledModal>
      }
    </MarginItem>
  );
}