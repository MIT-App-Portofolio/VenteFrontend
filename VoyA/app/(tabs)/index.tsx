import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, FlatList, Modal, TouchableOpacity, ScrollView, Linking, Dimensions, TextInput } from 'react-native';
import { BtnPrimary, BtnSecondary, CenterAligned, HorizontallyAligned, MarginItem, StyledGenderFilter, ThemedText } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile, EventPlace } from '@/api';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';

export default function HomeScreen() {
  const { api, userProfile } = useApi();
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

  if (!userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <ThemedText>No estas registrado en ningun evento.</ThemedText>
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
          <ThemedText type="subtitle">{displayName}</ThemedText>
          <ThemedText>{visitor.years} años</ThemedText>

          {
            visitor.igHandle && (
              <View style={styles.igContainer}>
                <FontAwesome name="instagram" size={16} color="gray" />
                <ThemedText type='link'>{visitor.igHandle}</ThemedText>
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
        <ThemedText type='subtitle'>{item.name}</ThemedText>
        {item.ageRequirement && (
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
            <ThemedText>+{item.ageRequirement}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</ThemedText>
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
        <ThemedText style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          textTransform: 'uppercase'
        }}>
          {viewingEventPlaces ? 'Ver Usuarios' : 'Ver Lugares de Eventos'}
        </ThemedText>
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
          <ThemedText type='title' style={{ alignSelf: 'flex-start' }}>Usuarios que tambien van a {userProfile.eventStatus.location?.name}</ThemedText>

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
            ListFooterComponent={loading ? (<CenterAligned>< ThemedText>Loading...</ ThemedText></CenterAligned>) : null}
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
            <ThemedText type="title">Filtrar</ThemedText>

            <ThemedText type="subtitle" style={{ marginTop: 20 }}>Genero</ThemedText>
            <StyledGenderFilter gender={genderFilter} setGender={setGenderFilter} />

            <ThemedText type="subtitle" style={{ marginTop: 20 }}>Rango de edad</ThemedText>
            <View style={styles.modalRow}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                placeholderTextColor='gray'
                value={ageRangeMin?.toString() || ''}
                onChangeText={(text) => setAgeRangeMin(text ? parseInt(text) : null)}
                style={styles.modalInput}
              />
              <ThemedText style={{ color: 'white', fontSize: 25 }}>-</ThemedText>
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
              <BtnSecondary title="Cerrar" onClick={() => setIsFilterModalVisible(false)} />
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
                    <ThemedText style={{ marginRight: 10 }} type="title">{selectedProfile.name}</ThemedText>
                  }

                  <ThemedText>@{selectedProfile.userName}</ThemedText>
                </View>

                <ThemedText style={{ marginTop: 10 }}>{selectedProfile.years} años</ThemedText>

                {selectedProfile.igHandle && (
                  <View style={styles.modalIgContainer}>
                    <FontAwesome name="instagram" size={16} color="white" />
                    <ThemedText type="link" onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}>
                      {selectedProfile.igHandle}
                    </ThemedText>
                  </View>
                )}

                <ThemedText>{selectedProfile.description}</ThemedText>

                {selectedProfile.eventStatus.with && selectedProfile.eventStatus.with.length > 0 && (
                  <ThemedText style={{ marginTop: 10 }}>Va con:</ThemedText>
                )}

                {/* Render profiles of users that go with the selected profile */}
                <View style={styles.invitedUsersContainer}>
                  {selectedProfile.eventStatus.with?.map((username) => {
                    const user = api.getUserUnstable(username);

                    if (!user) return null;

                    return (
                      <View key={username} style={styles.invitedUserCard}>
                        <Image source={{ uri: api.getPfpUnstable(username) }} style={styles.invitedUserProfilePicture} />
                        <ThemedText>{user.name || `@${user.userName}`}</ThemedText>
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
                  <ThemedText type="title" style={{ marginRight: 5 }}>{selectedEventPlace.name}</ThemedText>

                  {selectedEventPlace.ageRequirement && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
                      <ThemedText>+{selectedEventPlace.ageRequirement}</ThemedText>
                    </View>
                  )}
                </View>

                <ThemedText>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</ThemedText>

                <ThemedText>{selectedEventPlace.description}</ThemedText>

                <View style={styles.offersContainer}>
                  <ThemedText type="title">Ofertas:</ThemedText>

                  {selectedEventPlace.offers.map((offer, index) => (
                    <View key={index} style={styles.offer}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                        <ThemedText type="subtitle">{offer.name}</ThemedText>

                        {offer.price && <ThemedText>{offer.price}€</ThemedText>}
                      </View>

                      {offer.description && <ThemedText>{offer.description}</ThemedText>}

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
