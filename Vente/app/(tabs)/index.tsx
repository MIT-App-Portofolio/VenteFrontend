import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, Linking, Dimensions, TextInput, Animated } from 'react-native';
import { MarginItem } from '@/components/MarginItem';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { CenterAligned } from '@/components/CenterAligned';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile, EventPlace, EventPlaceEvent } from '@/api';
import { FontAwesome } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { StyledGenderFilter } from '@/components/GenderPicker';
import { StyledModal } from '@/components/StyledModal';

export default function HomeScreen() {
  const { api, userProfile } = useApi();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [visitors, setVisitors] = useState<string[]>([]);
  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);
  const [page, setPage] = useState(0);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPlaceEvent | null>(null);

  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [viewingEventPlaces, setViewingEventPlaces] = useState(false);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<number | null>(null);
  const [ageRangeMax, setAgeRangeMax] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;

  // View event places button interpolation
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [160, 40],
    extrapolate: 'clamp',
  });

  const fetchedFirstTime = useRef(false);
  useEffect(() => {
    fetchedFirstTime.current = true;
    setLastUserFetchEmpty(false);
    setPage(0);
    setVisitors([]);
    fetchVisitors(true);
  }, [userProfile?.eventStatus]);

  useEffect(() => {
    if (!fetchedFirstTime.current) {
      fetchVisitors();
    }
    fetchedFirstTime.current = false;
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

  const fetchVisitors = async (overrideLastFetch?: boolean) => {
    if (!overrideLastFetch && lastUserFetchEmpty) {
      return;
    }

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

  const handleEventClick = (event: EventPlaceEvent) => {
    setSelectedEvent(event);
    setIsEventModalVisible(true);
  };

  const toggleView = () => {
    setViewingEventPlaces(!viewingEventPlaces);
    if (!viewingEventPlaces) {
      fetchEventPlaces();
    }
  };

  if (loading)
    return (
      <CenterAligned>
        <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
      </CenterAligned>
    );

  if (!userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <ThemedText>No estas registrado en ningun evento.</ThemedText>
        <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
      </CenterAligned>
    );
  }

  console.log(JSON.stringify(eventPlaces, null, 2));

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
          <ThemedText type="subtitle" style={{ marginTop: 5 }}>{displayName}</ThemedText>
          <ThemedText>{visitor.years} años</ThemedText>

          {
            visitor.igHandle && (
              <View style={styles.igContainer}>
                <FontAwesome name="instagram" size={16} color="gray" />
                <ThemedText type='link' style={{ marginLeft: 2 }}>{visitor.igHandle}</ThemedText>
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
      <ThemedText type='subtitle' style={{ marginTop: 3 }}>{item.name}</ThemedText>
      {item.ageRequirement && (
        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3, marginTop: 5 }}>
          <ThemedText>+{item.ageRequirement}</ThemedText>
        </View>
      )}
      <ThemedText>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</ThemedText>
    </TouchableOpacity>
  );

  return (
    <HorizontallyAligned>
      {/* Normal view */}
      <Animated.View style={{
        backgroundColor: 'black',
        marginTop: 10,
        borderRadius: 15,
        width: '100%',
        height: buttonHeight,
      }}>
        <TouchableOpacity onPress={toggleView} style={{
          width: '100%',
          height: '100%',
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
      </Animated.View>

      {
        viewingEventPlaces ? (
          <Animated.ScrollView
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            contentContainerStyle={{ paddingBottom: 50 }}
            scrollEventThrottle={16}
          >
            <CenterAligned>
              {eventPlaces.map((value, _1, _2) => renderEventPlace({ item: value }))}
            </CenterAligned>
          </Animated.ScrollView>
        ) : (
          <Animated.ScrollView
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            <ThemedText type='title' style={{ alignSelf: 'flex-start', marginTop: 10 }}>Usuarios que tambien van a {userProfile.eventStatus.location?.name}</ThemedText>

            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, marginBottom: 10 }}>
              <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
            </View>

            <CenterAligned>
              {visitors.map((value, _1, _2) => renderVisitor({ item: value }))}
            </CenterAligned>
          </Animated.ScrollView>
        )
      }

      {/* Filter modal */}
      <StyledModal isModalVisible={isFilterModalVisible} setIsModalVisible={setIsFilterModalVisible} includeButton={false}>
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
      </StyledModal>

      {/* Profile modal */}
      {
        selectedProfile &&
        (
          <StyledModal isModalVisible={isUserModalVisible} setIsModalVisible={setIsUserModalVisible}>
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
                  <ThemedText type="link" style={{ marginLeft: 3 }} onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}>
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
          </StyledModal>
        )
      }

      {/* Event place modal */}
      {
        selectedEventPlace && (
          isEventModalVisible && selectedEvent != null ? (
            <StyledModal isModalVisible={isEventModalVisible} setIsModalVisible={setIsEventModalVisible} >
              <ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', }}>
                  <Image source={{ uri: selectedEvent.image }} style={{ height: 200, width: 120, flex: 1, borderRadius: 8, marginRight: 5 }} />
                  <View style={{ flex: 2 }}>
                    <ThemedText type="title">{selectedEvent.name}</ThemedText>
                    <ThemedText style={{ marginTop: 5 }}>{selectedEvent.description}</ThemedText>
                  </View>
                </View>

                <View style={styles.offersContainer}>
                  <ThemedText type="title">Ofertas:</ThemedText>

                  {selectedEvent.offers.map((offer, index) => (
                    <View key={index} style={styles.offer}>
                      <ThemedText type="subtitle">{offer.name}</ThemedText>

                      {offer.price && <ThemedText>{offer.price}€</ThemedText>}

                      {offer.description && <ThemedText>{offer.description}</ThemedText>}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </StyledModal>
          ) : (
            <StyledModal isModalVisible={isEventPlaceModalVisible} setIsModalVisible={setIsEventPlaceModalVisible}>
              <ScrollView>
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

                <ThemedText type="title">{selectedEventPlace.name}</ThemedText>

                {selectedEventPlace.ageRequirement && (
                  <View style={{ alignSelf: 'flex-start', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3, marginTop: 5 }}>
                    <ThemedText>+{selectedEventPlace.ageRequirement}</ThemedText>
                  </View>
                )}

                <ThemedText style={{ marginTop: 5 }}>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</ThemedText>

                <ThemedText style={{ marginTop: 5 }}>{selectedEventPlace.description}</ThemedText>

                {
                  selectedEventPlace.events.length > 0 &&
                  <View style={{ marginTop: 10 }}>
                    <ThemedText type="title">Eventos:</ThemedText>

                    {selectedEventPlace.events.map((event, index) => (
                      <View key={index} style={{ marginTop: 10, padding: 10, borderRadius: 5, borderWidth: 0.7, borderColor: '#ffffff7f' }}>
                        <TouchableOpacity onPress={() => handleEventClick(event)} style={{ flex: 1, flexDirection: 'row', minHeight: 100 }}>
                          <Image source={{ uri: event.image }} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 5, marginRight: 8 }} />
                          <View style={{ flex: 3 }}>
                            <ThemedText type="subtitle">{event.name}</ThemedText>
                            <ThemedText>{event.description}</ThemedText>
                            <ThemedText>{event.offers.length} ofertas</ThemedText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                }
              </ScrollView>
            </StyledModal>
          )
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
  igContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalIgContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
  offer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 0.7,
    borderColor: '#ffffff7f',
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
  flatListContent: {
    paddingBottom: 250,
  },
  loadingText: {
    color: 'white',
  },
});
