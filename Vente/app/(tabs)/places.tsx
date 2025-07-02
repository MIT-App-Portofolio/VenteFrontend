import { EventPlace, EventPlaceEvent, useApi } from "@/api";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Animated, Dimensions, TouchableOpacity, View, Image, ScrollView, StyleSheet, Linking, Platform } from "react-native";
import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText, ViewMoreThemedText } from "@/components/ThemedText";
import { CenterAligned } from "@/components/CenterAligned";
import { StyledModal } from "@/components/StyledModal";
import Carousel from "react-native-reanimated-carousel";
import { pfpSize, styles as usersPageStyles } from './index';
import { BtnPrimary } from "@/components/Buttons";
import FastImage from "react-native-fast-image";
import { dateOnlyDisplay } from "@/dateDisplay";
import { Feather } from '@expo/vector-icons';
import { EventPlaceTypeBadge } from "@/components/EventPlaceTypeBadge";

export default function Places() {
  const { api } = useApi();

  const { selectedExitId, eventId } = useLocalSearchParams<{ selectedExitId: string, eventId?: string }>();

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);
  // Local state to track user's event attendance
  const [userEventAttendance, setUserEventAttendance] = useState<{ [eventId: number]: boolean }>({});
  // Local state to track attendee counts
  const [eventAttendeeCounts, setEventAttendeeCounts] = useState<{ [eventId: number]: number }>({});

  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPlaceEvent | null>(null);

  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Focus effect to handle navigation events and eventId parameter
  useFocusEffect(
    useCallback(() => {
      // If eventId is provided and we have places loaded, open the modal
      if (eventId && eventPlaces.length > 0) {
        const eventIdNum = parseInt(eventId);
        for (const place of eventPlaces) {
          const foundEvent = place.events.find(event => event.id === eventIdNum);
          if (foundEvent) {
            setSelectedEventPlace(place);
            setSelectedEvent(foundEvent);
            setIsEventPlaceModalVisible(true);
            setIsEventModalVisible(true);
            break;
          }
        }
      }
    }, [selectedExitId, eventId, eventPlaces])
  );

  useEffect(() => {
    const f = async () => {
      setLoading(true);
      const places = await api.queryEventPlaces(parseInt(selectedExitId));
      if (places) {
        setEventPlaces(places);

        // Initialize local attendance state and counts from server data
        const attendanceState: { [eventId: number]: boolean } = {};
        const countsState: { [eventId: number]: number } = {};

        places.forEach(place => {
          place.events.forEach(event => {
            attendanceState[event.id] = event.userAttends;
            countsState[event.id] = event.attendants;
          });
        });

        setUserEventAttendance(attendanceState);
        setEventAttendeeCounts(countsState);

        // If eventId is provided, find and open the event modal
        if (eventId) {
          const eventIdNum = parseInt(eventId);
          for (const place of places) {
            const foundEvent = place.events.find(event => event.id === eventIdNum);
            if (foundEvent) {
              setSelectedEventPlace(place);
              setSelectedEvent(foundEvent);
              setIsEventPlaceModalVisible(true);
              setIsEventModalVisible(true);
              break;
            }
          }
        }
      }
      setLoading(false);
    };
    f()
  }, [selectedExitId, eventId]);

  // Get the current attendance status (with local override)
  const getUserAttends = (eventId: number) => {
    return userEventAttendance[eventId] ?? false;
  };

  // Get the current attendee count (with local override)
  const getAttendeeCount = (eventId: number) => {
    return eventAttendeeCounts[eventId] ?? 0;
  };

  const handleToggleAttendance = async (event: EventPlaceEvent) => {
    const currentlyAttending = getUserAttends(event.id);
    const currentCount = getAttendeeCount(event.id);

    // Optimistically update UI
    setUserEventAttendance(prev => ({
      ...prev,
      [event.id]: !currentlyAttending
    }));

    setEventAttendeeCounts(prev => ({
      ...prev,
      [event.id]: currentlyAttending ? currentCount - 1 : currentCount + 1
    }));

    // Make API call
    const success = currentlyAttending
      ? await api.unattendEvent(parseInt(selectedExitId), event.id)
      : await api.attendEvent(parseInt(selectedExitId), event.id);

    // If API call failed, revert the optimistic update
    if (!success) {
      setUserEventAttendance(prev => ({
        ...prev,
        [event.id]: currentlyAttending
      }));

      setEventAttendeeCounts(prev => ({
        ...prev,
        [event.id]: currentCount
      }));
    }
  };

  const handleViewAttendees = async (event: EventPlaceEvent) => {
    // Close all modals before navigating
    setIsEventPlaceModalVisible(false);
    setIsEventModalVisible(false);
    router.push(`/event?exitId=${selectedExitId}&eventId=${event.id}`);
  };

  const renderEventPlace = ({ item }: { item: EventPlace }) => (
    <TouchableOpacity key={item.name} style={styles.card} onPress={() => {
      setSelectedEventPlace(item);
      setIsEventPlaceModalVisible(true);
    }}>
      <FastImage source={{ uri: item.imageUrls.length > 0 ? item.imageUrls[0] : undefined }} style={styles.profilePicture} />
      <ThemedText type='subtitle' style={{ marginTop: 3, maxWidth: pfpSize * 0.9 }} ellipsizeMode="tail" numberOfLines={1}>{item.name}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
        <EventPlaceTypeBadge type={item.type} />
        {item.ageRequirement && (
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
            <ThemedText>+{item.ageRequirement}</ThemedText>
          </View>
        )}
      </View>
      {item.priceRangeBegin && item.priceRangeEnd &&
        <ThemedText>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</ThemedText>
      }
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <CenterAligned>
        <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
      </CenterAligned>
    );
  }

  return (
    <HorizontallyAligned>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/")}
      >
        <Feather name="arrow-left" size={24} color="white" />
      </TouchableOpacity>

      <Animated.ScrollView
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50, marginTop: Platform.OS === 'android' ? 30 : 0 }}
        scrollEventThrottle={16}
      >
        <CenterAligned>
          {eventPlaces.map((value, _1, _2) => renderEventPlace({ item: value }))}
        </CenterAligned>
      </Animated.ScrollView>

      {
        selectedEventPlace && (
          isEventModalVisible && selectedEvent != null ? (
            <StyledModal isModalVisible={isEventModalVisible} setIsModalVisible={setIsEventModalVisible} >
              <ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                  <WidthFillingImage url={selectedEvent.image} maxHeight={250} />
                  <View style={{ flex: 2 }}>
                    <ThemedText type="title">{selectedEvent.name}</ThemedText>
                    <ThemedText type="subtitle">{dateOnlyDisplay(new Date(selectedEvent.time))}</ThemedText>
                    {selectedEvent.description && selectedEvent.description.length > 0 &&
                      <ViewMoreThemedText style={{ marginTop: 5 }} maxLines={6}>
                        {selectedEvent.description}
                      </ViewMoreThemedText>
                    }

                  </View>
                </View>

                {selectedEvent.purchaseLink && (
                  <View style={{ marginTop: 10 }}>
                    <BtnPrimary title="Comprar entradas" onClick={() => { Linking.openURL(selectedEvent.purchaseLink!) }} />
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <BtnPrimary
                    title={getUserAttends(selectedEvent.id) ? "No voy" : "Voy"}
                    onClick={() => handleToggleAttendance(selectedEvent)}
                    style={{
                      backgroundColor: getUserAttends(selectedEvent.id) ? '#ff6b6b' : '#4CAF50'
                    }}
                  />
                </View>

                <View style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    style={styles.attendeesButton}
                    onPress={() => handleViewAttendees(selectedEvent)}
                  >
                    <ThemedText style={{ textAlign: 'center', color: '#4CAF50' }}>
                      {getAttendeeCount(selectedEvent.id)} usuarios van, ¿ver quiénes?
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {selectedEvent.offers.length > 0 &&
                  <View style={styles.offersContainer}>
                    <ThemedText type="title">Ofertas</ThemedText>

                    {selectedEvent.offers.map((offer, index) => (
                      <View key={index} style={styles.offer}>
                        <ThemedText type="subtitle">{offer.name}</ThemedText>

                        {offer.price && <ThemedText>{offer.price}€</ThemedText>}

                        {offer.description && <ThemedText>{offer.description}</ThemedText>}
                      </View>
                    ))}
                  </View>
                }

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

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <EventPlaceTypeBadge type={selectedEventPlace.type} />
                  {selectedEventPlace.ageRequirement && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3 }}>
                      <ThemedText>+{selectedEventPlace.ageRequirement}</ThemedText>
                    </View>
                  )}
                </View>

                {selectedEventPlace.priceRangeBegin && selectedEventPlace.priceRangeEnd &&
                  <ThemedText style={{ marginTop: 5 }}>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</ThemedText>
                }

                {selectedEventPlace.description && selectedEventPlace.description.length > 0 &&
                  <ViewMoreThemedText style={{ marginTop: 5 }} maxLines={3}>
                    {selectedEventPlace.description}
                  </ViewMoreThemedText>
                }


                {
                  selectedEventPlace.googleMapsLink && (
                    <View style={{ marginTop: 20 }}>
                      <BtnPrimary title="Abrir en mapas" onClick={() => { Linking.openURL(selectedEventPlace.googleMapsLink!) }} />
                    </View>
                  )
                }

                {
                  selectedEventPlace.events.length > 0 &&
                  <View style={{ marginTop: 10 }}>
                    <ThemedText type="title">Eventos</ThemedText>

                    {selectedEventPlace.events.map((event, index) => (
                      <View style={{ marginTop: 10 }} key={index}>
                        <ThemedText type="subtitle">{dateOnlyDisplay(new Date(event.time))}</ThemedText>

                        <View key={index} style={{ marginTop: 10, padding: 10, borderRadius: 5, borderWidth: 0.7, borderColor: '#ffffff7f' }}>
                          <TouchableOpacity onPress={() => {
                            setSelectedEvent(event);
                            setIsEventModalVisible(true);
                          }} style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
                            <View style={{ flex: 1, maxWidth: 120, height: 120 }}>
                              <FastImage
                                source={{ uri: event.image }}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: 16,
                                }}
                                resizeMode="contain"
                              />
                            </View>

                            <View style={{ flex: 2, flexDirection: 'column', height: 120 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {event.purchaseLink && (
                                  <View style={{
                                    backgroundColor: '#4CAF50',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4
                                  }}>
                                    <ThemedText style={{ fontSize: 12 }}>Entradas</ThemedText>
                                  </View>
                                )}
                                <ThemedText type="subtitle" numberOfLines={1} ellipsizeMode="tail">{event.name}</ThemedText>
                              </View>
                              <ThemedText style={{ marginTop: 5, flexShrink: 1 }} numberOfLines={3} ellipsizeMode="tail">{event.description}</ThemedText>
                              <View style={{ flex: 1 }} />
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                                <ThemedText>
                                  {event.offers.length} {event.offers.length == 1 ? "oferta" : "ofertas"}
                                </ThemedText>
                                <ThemedText style={{ fontSize: 12, color: '#888' }}>
                                  {getAttendeeCount(event.id)} asistiendo
                                </ThemedText>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                }
              </ScrollView>
            </StyledModal >
          )
        )
      }
    </HorizontallyAligned >
  );
}

type WidthFillingImageProps = {
  url?: string,
  maxHeight: number
};

function WidthFillingImage({ url, maxHeight }: WidthFillingImageProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  return (<View style={{ flex: 1 }}>
    <FastImage
      source={{ uri: url }}
      style={{
        borderRadius: 8,
        width: '100%',
        maxHeight: maxHeight,
        aspectRatio: imageAspectRatio,
      }}
      onLoad={(e) =>
        setImageAspectRatio(e.nativeEvent.width / e.nativeEvent.height)
      }
    />
  </View>);
}

const styles = StyleSheet.create({
  eventPlacesContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    marginTop: 20,
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
  attendeesButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
  },
  card: usersPageStyles.card,
  profilePicture: usersPageStyles.profilePicture,
  loadingText: usersPageStyles.loadingText,
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 30 : 10,
    left: 10,
    zIndex: 1,
    padding: 10,
  },
});