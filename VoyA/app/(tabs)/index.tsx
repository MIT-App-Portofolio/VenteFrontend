import React, { useEffect, useState } from 'react';
import { Text, View, Image, StyleSheet, FlatList, Modal, TouchableOpacity, ScrollView, Linking, Dimensions, TextInput } from 'react-native';
import { BtnPrimary, BtnSecondary, CenterAligned, HorizontallyAligned, MarginItem } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile, EventPlace } from '@/api';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { Picker } from '@react-native-picker/picker';

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [visitors, setVisitors] = useState<string[]>([]);
  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);
  const [page, setPage] = useState(0);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);

  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [viewingEventPlaces, setViewingEventPlaces] = useState(false);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<number | null>(null);
  const [ageRangeMax, setAgeRangeMax] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchVisitors();
  }, [page]);

  useEffect(() => {
    visitors.forEach(visitor => {
      var profile = api.getUserUnstable(visitor);
      if (profile.eventStatus.with) {
        profile.eventStatus.with.forEach(async withUser => {
          if (!api.hasUser(withUser)) {
            // These functions would cache the respective values so that they can be accessed with unstable functions
            await api.getUser(withUser);
            await api.fetchPfp(withUser);
          }
        });
      }
    });
  }, [visitors]);

  const fetchVisitors = async () => {
    if (lastUserFetchEmpty) return;

    setLoading(true);
    const newVisitors = await api.queryVisitors(page, genderFilter, ageRangeMin, ageRangeMax);

    if (!newVisitors || newVisitors.length === 0) {
      setLastUserFetchEmpty(true);
    }

    if (newVisitors) {
      setVisitors(prevVisitors => [...prevVisitors, ...newVisitors]);
      newVisitors.forEach(async visitor => {
        await api.fetchPfp(visitor);
      });
    }

    setLoading(false);
  };

  const fetchEventPlaces = async () => {
    if (eventPlaces.length === 0) {
      setLoading(true);
      const places = await api.queryEventPlaces();
      if (places) {
        setEventPlaces(places);
      }
      setLoading(false);
    }
  };

  const applyFilter = async () => {
    setLoading(true);
    setPage(0);
    setLastUserFetchEmpty(false);
    setVisitors([]);

    await fetchVisitors();

    setIsFilterModalVisible(false);
    setLoading(false);
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsUserModalVisible(true);
  };

  const handleEventPlaceClick = (place: EventPlace) => {
    setSelectedEventPlace(place);
    setIsEventPlaceModalVisible(true);
  };

  const closeModal = () => {
    setIsUserModalVisible(false);
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

  const renderVisitor = ({ item }: { item: string }) => {
    var visitor = api.getUserUnstable(item);
    var pfpUrl = api.getPfpUnstable(item);

    if (visitor == null) {
      return null;
    }

    const displayName = visitor.name || `@${visitor.userName}`;

    return (
      <TouchableOpacity key={visitor.userName} style={styles.card} onPress={() => handleProfileClick(visitor!)}>
        <Image source={{ uri: pfpUrl }} style={styles.profilePicture} />
        <View style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={{ color: 'white' }}>{visitor.years} años</Text>

          {
            visitor.igHandle && (
              <View style={styles.igContainer}>
                <FontAwesome name="instagram" size={16} color="gray" />
                <Text style={styles.igHandle}>{visitor.igHandle}</Text>
              </View>
            )
          }
        </View >
      </TouchableOpacity >
    );
  };

  const renderEventPlace = ({ item }: { item: EventPlace }) => (
    <TouchableOpacity key={item.name} style={styles.card} onPress={() => handleEventPlaceClick(item)}>
      <Image source={{ uri: item.imageUrls[0] }} style={styles.profilePicture} />
      <View style={{ alignItems: 'flex-end', flexDirection: 'row', marginBottom: 5 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.ageRequirement && (
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
            <Text style={{ color: 'white' }}>+{item.ageRequirement}</Text>
          </View>
        )}
      </View>
      <Text style={styles.priceRange}>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</Text>
    </TouchableOpacity>
  );

  return (
    <HorizontallyAligned>
      {/* Normal view */}
      <TouchableOpacity onPress={toggleView} style={{
        backgroundColor: 'black',
        borderRadius: 15,
        marginTop: 160,
        width: '100%',
        height: 160,
      }}>
        <Image source={require('../../assets/images/club.jpeg')} style={{ width: '100%', height: '100%', borderRadius: 15, opacity: 0.4 }} />
        <Text style={{
          color: 'white',
          position: 'absolute',
          bottom: 10,
          left: 10,
          textTransform: 'uppercase'
        }}>
          {viewingEventPlaces ? 'Ver Usuarios' : 'Ver Lugares de Eventos'}
        </Text>
      </TouchableOpacity>

      {viewingEventPlaces ? (
        <View style={{ width: '100%', height: '100%', alignItems: 'center', marginTop: 20 }}>
          <FlatList
            data={eventPlaces}
            renderItem={renderEventPlace}
            keyExtractor={item => item.name}
            contentContainerStyle={{ paddingBottom: 350 }}
          />
        </View>
      ) : (
        <View style={{ width: '100%', height: '100%', alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: 'white', fontSize: 20, alignSelf: 'flex-start' }}>Usuarios que tambien van a {api.userProfile.eventStatus.location?.name}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, marginBottom: 10 }}>
            <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
          </View>

          <FlatList
            data={visitors}
            renderItem={renderVisitor}
            keyExtractor={item => item}
            onEndReached={() => setPage(prevPage => prevPage + 1)}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 350 }}
            ListFooterComponent={loading ? (<CenterAligned><Text style={{ color: 'white' }}>Loading...</Text></CenterAligned>) : null}
          />
        </View>
      )}

      {/* Filter modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar</Text>

            <Text style={styles.modalLabel}>Genero</Text>
            <Picker
              selectedValue={genderFilter}
              onValueChange={(itemValue) => setGenderFilter(itemValue)}
              style={styles.modalPicker}
            >
              <Picker.Item label="Qualquier" value={null} />
              <Picker.Item label="Hombre" value={0} />
              <Picker.Item label="Mujer" value={1} />
            </Picker>

            <Text style={styles.modalLabel}>Rango de edad</Text>
            <View style={styles.modalRow}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                placeholderTextColor='gray'
                value={ageRangeMin?.toString() || ''}
                onChangeText={(text) => setAgeRangeMin(text ? parseInt(text) : null)}
                style={styles.modalInput}
              />
              <Text style={{ color: 'white', fontSize: 25 }}>-</Text>
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                placeholderTextColor='gray'
                value={ageRangeMax?.toString() || ''}
                onChangeText={(text) => setAgeRangeMax(text ? parseInt(text) : null)}
                style={styles.modalInput}
              />
            </View>

            <MarginItem>
              <BtnPrimary title="Aplicar filtro" onClick={applyFilter} />
            </MarginItem>
            <MarginItem>
              <BtnSecondary title="Cancelar" onClick={() => setIsFilterModalVisible(false)} />
            </MarginItem>
          </View>
        </View>
      </Modal>

      {/* Profile modal */}
      {
        selectedProfile && (
          <Modal
            visible={isUserModalVisible}
            animationType="slide"
            transparent={true}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <ScrollView style={styles.modalContent}>
                <Image source={{ uri: api.getPfpUnstable(selectedProfile.userName) }} style={styles.modalProfilePicture} />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  {
                    selectedProfile.name &&
                    <Text style={{ ...styles.modalName, marginRight: 10 }}>{selectedProfile.name}</Text>
                  }

                  <Text style={styles.modalUsername}>@{selectedProfile.userName}</Text>
                </View>

                <Text style={{ color: 'white', fontSize: 18, marginTop: 10, }}>{selectedProfile.years} años</Text>

                {selectedProfile.igHandle && (
                  <View style={styles.modalIgContainer}>
                    <FontAwesome name="instagram" size={16} color="white" />
                    <Text style={styles.modalIgHandle} onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}>
                      {selectedProfile.igHandle}
                    </Text>
                  </View>
                )}

                <Text style={styles.modalDescription}>{selectedProfile.description}</Text>

                {selectedProfile.eventStatus.with && selectedProfile.eventStatus.with.length > 0 && (
                  <Text style={{ color: 'white', fontSize: 16, marginTop: 10 }}>Va con:</Text>
                )}

                {/* Render profiles of users that go with the selected profile */}
                <View style={styles.invitedUsersContainer}>
                  {selectedProfile.eventStatus.with?.map((username) => {
                    const user = api.getUserUnstable(username);

                    if (!user) return null;

                    return (
                      <View key={username} style={styles.invitedUserCard}>
                        <Image source={{ uri: api.getPfpUnstable(username) }} style={styles.invitedUserProfilePicture} />
                        <Text style={styles.invitedUserName}>{user.name || `@${user.userName}`}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Modal>
        )
      }


      {/* Event place modal */}
      {
        selectedEventPlace && (
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
                <CenterAligned>
                  <Carousel
                    loop
                    width={screenWidth * 0.9}
                    height={200}
                    autoPlay={true}
                    data={selectedEventPlace.imageUrls}
                    renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: '100%', height: 200 }} />}
                  />
                </CenterAligned>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...styles.modalName, marginRight: 5 }}>{selectedEventPlace.name}</Text>

                  {selectedEventPlace.ageRequirement && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
                      <Text style={{ color: 'white' }}>+{selectedEventPlace.ageRequirement}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalPriceRange}>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</Text>

                <Text style={styles.modalDescription}>{selectedEventPlace.description}</Text>

                <View style={styles.offersContainer}>
                  <Text style={styles.offersTitle}>Ofertas:</Text>

                  {selectedEventPlace.offers.map((offer, index) => (
                    <View key={index} style={styles.offer}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                        <Text style={styles.offerName}>{offer.name}</Text>

                        {offer.price && <Text style={styles.offerPrice}>{offer.price}€</Text>}
                      </View>

                      {offer.description && <Text style={styles.offerDescription}>{offer.description}</Text>}

                      {offer.image && <Image source={{ uri: offer.image }} style={styles.offerImage} />}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Modal>
        )
      }
    </HorizontallyAligned >
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
    textDecorationLine: 'underline',
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
  offersContainer: {
    marginTop: 20,
  },
  offersTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  offer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white'
  },
  offerName: {
    fontSize: 18,
    marginRight: 5,
    color: 'white',
    fontWeight: 'bold',
  },
  offerDescription: {
    fontSize: 16,
    color: 'white',
  },
  offerPrice: {
    fontSize: 16,
    color: 'white',
  },
  offerImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginTop: 10,
  },
  invitedUsersContainer: {
    marginTop: 20,
  },
  invitedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  invitedUserProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  invitedUserName: {
    fontSize: 16,
    color: 'white',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    marginBottom: 10,
  },
  modalLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  modalPicker: {
    color: 'white',
    marginBottom: 20,
    backgroundColor: 'black',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInput: {
    padding: 10,
    borderColor: 'white',
    color: 'white',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 4,
    width: '45%',
  },
  toggleButton: {
    backgroundColor: 'black',
    borderRadius: 15,
    width: '100%',
    height: 200,
  },
  toggleButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    opacity: 0.4,
  },
  toggleButtonText: {
    color: 'white',
    position: 'absolute',
    bottom: 10,
    left: 10,
    textTransform: 'uppercase',
  },
  eventPlacesContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  visitorsContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  visitorsTitle: {
    color: 'white',
    fontSize: 20,
    alignSelf: 'flex-start',
  },
  flatListContent: {
    paddingBottom: 250,
  },
  loadingText: {
    color: 'white',
  },
});
