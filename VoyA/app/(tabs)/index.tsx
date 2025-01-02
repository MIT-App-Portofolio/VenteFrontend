import React, { useEffect, useState } from 'react';
import { Text, View, Image, StyleSheet, FlatList, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { BtnPrimary, CenterAligned, HorizontallyAligned } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile, EventPlace } from '@/api';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const [visitors, setVisitors] = useState<string[]>([]);
  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [viewingEventPlaces, setViewingEventPlaces] = useState(false);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, [page]);

  useEffect(() => {
    visitors.forEach(visitor => {
      var profile = api.getUserUnstable(visitor);
      if (profile.eventStatus.with) {
        profile.eventStatus.with.forEach(async withUser => {
          if (!api.hasUser(withUser)) {
            // These functions would cache the respective values so that they can be accessed with sync unstable functions
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
    const newVisitors = await api.queryVisitors(page);

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
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <Text style={styles.name}>{displayName}</Text>
          {visitor.igHandle && (
            <View style={styles.igContainer}>
              <FontAwesome name="instagram" size={16} color="gray" />
              <Text style={styles.igHandle}>{visitor.igHandle}</Text>
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
      <Text style={styles.priceRange}>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</Text>
    </TouchableOpacity>
  );

  return (
    <HorizontallyAligned>
      <TouchableOpacity onPress={toggleView} style={{
        backgroundColor: 'black',
        borderRadius: 15,
        width: '100%',
        height: 200,
      }}>
        <Image source={require('../../assets/images/club.jpeg')} style={{ width: '100%', height: '100%', borderRadius: 5, opacity: 0.4 }} />
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
          />
        </View>
      ) : (
        <View style={{ width: '100%', height: '100%', alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: 'white', fontSize: 20, alignSelf: 'flex-start' }}>Usuarios que tambien van a {api.userProfile.eventStatus.location?.name}</Text>
          <FlatList
            data={visitors}
            renderItem={renderVisitor}
            keyExtractor={item => item}
            onEndReached={() => setPage(prevPage => prevPage + 1)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading ? (<CenterAligned><Text style={{ color: 'white' }}>Loading...</Text></CenterAligned>) : null}
          />
        </View>
      )}

      {
        selectedProfile && (
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
                <Image source={{ uri: api.getPfpUnstable(selectedProfile.userName) }} style={styles.modalProfilePicture} />

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
});
