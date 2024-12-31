import React, { useEffect, useState } from 'react';
import { Text, View, Image, StyleSheet, FlatList, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { BtnPrimary, CenterAligned } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile, EventPlace } from '@/api';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const [visitors, setVisitors] = useState<Profile[]>([]);
  const [visitorPfps, setVisitorPfps] = useState<{ [key: string]: string }>({});
  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [viewingEventPlaces, setViewingEventPlaces] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, [page]);

  const fetchVisitors = async () => {
    setLoading(true);
    const newVisitors = await api.queryVisitors(page);
    if (newVisitors) {
      setVisitors(prevVisitors => [...prevVisitors, ...newVisitors]);
      const pfps = await Promise.all(
        newVisitors.map(visitor => api.fetchPfp(visitor.userName))
      );
      const pfpMap = newVisitors.reduce((acc, visitor, index) => {
        acc[visitor.userName] = pfps[index];
        return acc;
      }, {} as { [key: string]: string });
      setVisitorPfps(prevPfps => ({ ...prevPfps, ...pfpMap }));
    }
    setLoading(false);
  };

  const fetchEventPlaces = async () => {
    if (eventPlaces.length === 0) {
      setLoading(true);
      const places = await api.queryEventPlaces();
      console.log(places);
      if (places) {
        setEventPlaces(places);
      }
      setLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalVisible(true);
  };

  const handleEventPlaceClick = (place: EventPlace) => {
    setSelectedEventPlace(place);
    setIsEventPlaceModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedProfile(null);
  };

  const closeEventPlaceModal = () => {
    setIsEventPlaceModalVisible(false);
    setSelectedEventPlace(null);
  };

  const toggleView = () => {
    setViewingEventPlaces(!viewingEventPlaces);
    if (!viewingEventPlaces) {
      fetchEventPlaces();
    }
  };

  if (!api.userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <Text style={{ color: 'white' }}>No estas registrado en ningun evento.</Text>
        <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
      </CenterAligned>
    );
  }

  const renderVisitor = ({ item }: { item: Profile }) => {
    const displayName = item.name || `@${item.userName}`;

    return (
      <TouchableOpacity key={item.userName} style={styles.card} onPress={() => handleProfileClick(item)}>
        <Image source={{ uri: visitorPfps[item.userName] }} style={styles.profilePicture} />
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <Text style={styles.name}>{displayName}</Text>
          {item.igHandle && (
            <View style={styles.igContainer}>
              <FontAwesome name="instagram" size={16} color="gray" />
              <Text style={styles.igHandle}>{item.igHandle}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventPlace = ({ item }: { item: EventPlace }) => (
    <TouchableOpacity key={item.name} style={styles.card} onPress={() => handleEventPlaceClick(item)}>
      <Image source={{ uri: item.imageUrls[0] }} style={styles.profilePicture} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.priceRange}>{item.priceRangeBegin} - {item.priceRangeEnd}</Text>
    </TouchableOpacity>
  );

  return (
    <CenterAligned>
      <BtnPrimary title={viewingEventPlaces ? 'Ver Usuarios' : 'Ver Lugares de Eventos'} onClick={toggleView} />
      {viewingEventPlaces ? (
        <FlatList
          data={eventPlaces}
          renderItem={renderEventPlace}
          keyExtractor={item => item.name}
        />
      ) : (
        <FlatList
          data={visitors}
          renderItem={renderVisitor}
          keyExtractor={item => item.userName}
          onEndReached={() => setPage(prevPage => prevPage + 1)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? (<CenterAligned><Text style={{ color: 'white' }}>Loading...</Text></CenterAligned>) : null}
        />
      )}
      {selectedProfile && (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <ScrollView style={styles.modalContent}>
              <Image source={{ uri: visitorPfps[selectedProfile.userName] }} style={styles.modalProfilePicture} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ ...styles.modalName, marginRight: 10 }}>{selectedProfile.name}</Text>
                <Text style={styles.modalUsername}>@{selectedProfile.userName}</Text>
              </View>
              {selectedProfile.igHandle && (
                <View style={styles.modalIgContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <Text style={styles.modalIgHandle} onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}>
                    {selectedProfile.igHandle}
                  </Text>
                </View>
              )}
              <Text style={styles.modalDescription}>{selectedProfile.description}</Text>
            </ScrollView>
          </View>
        </Modal>
      )}
      {selectedEventPlace && (
        <Modal
          visible={isEventPlaceModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={closeEventPlaceModal} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <ScrollView style={styles.modalContent}>
              <ScrollView horizontal pagingEnabled>
                {selectedEventPlace.imageUrls.map((image, index) => (
                  <Image key={index} source={{ uri: image }} style={styles.modalProfilePicture} />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ ...styles.modalName, marginRight: 5 }}>{selectedEventPlace.name}</Text>
                <Text style={styles.modalPriceRange}>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</Text>
              </View>
              <Text style={styles.modalDescription}>{selectedEventPlace.description}</Text>
            </ScrollView>
          </View>
        </Modal>
      )}
    </CenterAligned>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'black',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
  },
  profilePicture: {
    width: 250,
    height: 250,
    borderRadius: 10,
  },
  name: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
    marginRight: 5,
  },
  igContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  igHandle: {
    color: 'gray',
    fontSize: 14,
  },
  priceRange: {
    color: 'white',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: 'black',
    padding: 20,
    marginTop: 80,
    borderRadius: 10,
    width: '100%',
    height: '100%',
  },
  modalProfilePicture: {
    width: '100%',
    borderRadius: 15,
    height: undefined,
    aspectRatio: 1,
  },
  modalName: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  modalUsername: {
    fontSize: 18,
    color: 'gray',
  },
  modalIgContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIgHandle: {
    fontSize: 18,
    marginLeft: 5,
    color: 'white',
  },
  modalPriceRange: {
    fontSize: 18,
    color: 'gray',
  },
  modalDescription: {
    fontSize: 16,
    color: 'white',
    marginVertical: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
  },
});
