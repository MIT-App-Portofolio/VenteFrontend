import { EventPlace, EventPlaceEvent, useApi } from "@/api";
import { useEffect, useRef, useState } from "react";
import { useRouter } from 'expo-router';
import { Animated, Dimensions, TouchableOpacity, View, Image, ScrollView, StyleSheet, Linking } from "react-native";
import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText } from "@/components/ThemedText";
import { CenterAligned } from "@/components/CenterAligned";
import { StyledModal } from "@/components/StyledModal";
import Carousel from "react-native-reanimated-carousel";
import { styles as usersPageStyles } from '.';
import { BtnPrimary } from "@/components/Buttons";
import FastImage from "react-native-fast-image";

export default function Places() {
  const { api, userProfile } = useApi();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [eventPlaces, setEventPlaces] = useState<EventPlace[]>([]);

  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPlaceEvent | null>(null);

  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [160, 40],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const f = async () => {
      if (eventPlaces.length === 0) {
        setLoading(true);
        const places = await api.queryEventPlaces();
        if (places) {
          setEventPlaces(places);
        }
        setLoading(false);
      }
    };
    f()
  }, [userProfile?.eventStatus]);


  const renderEventPlace = ({ item }: { item: EventPlace }) => (
    <TouchableOpacity key={item.name} style={styles.card} onPress={() => {
      setSelectedEventPlace(item);
      setIsEventPlaceModalVisible(true);
    }}>
      <FastImage source={{ uri: item.imageUrls.length > 0 ? item.imageUrls[0] : undefined }} style={styles.profilePicture} />
      <ThemedText type='subtitle' style={{ marginTop: 3 }}>{item.name}</ThemedText>
      {item.ageRequirement && (
        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3, marginTop: 5 }}>
          <ThemedText>+{item.ageRequirement}</ThemedText>
        </View>
      )}
      <ThemedText>{item.priceRangeBegin}€ - {item.priceRangeEnd}€</ThemedText>
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
      <Animated.View style={{
        backgroundColor: 'black',
        marginTop: 10,
        borderRadius: 15,
        width: '100%',
        height: buttonHeight,
      }}>
        <TouchableOpacity onPress={() => router.push("/")} style={{
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
            Ver Usuarios
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
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

      {
        selectedEventPlace && (
          isEventModalVisible && selectedEvent != null ? (
            <StyledModal isModalVisible={isEventModalVisible} setIsModalVisible={setIsEventModalVisible} >
              <ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', }}>
                  <FastImage source={{ uri: selectedEvent.image }} style={{ height: 200, width: 120, flex: 1, borderRadius: 8, marginRight: 5 }} />
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
                        <TouchableOpacity onPress={() => {
                          setSelectedEvent(event);
                          setIsEventModalVisible(true);
                        }} style={{ flex: 1, flexDirection: 'row', minHeight: 100 }}>
                          <FastImage source={{ uri: event.image }} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 5, marginRight: 8 }} />
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

                {
                  selectedEventPlace.googleMapsLink && (
                    <View style={{ marginTop: 20 }}>
                      <BtnPrimary title="Abrir en mapas" onClick={() => { Linking.openURL(selectedEventPlace.googleMapsLink!) }} />
                    </View>
                  )
                }
              </ScrollView>
            </StyledModal>
          )
        )
      }
    </HorizontallyAligned>
  );
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
  card: usersPageStyles.card,
  profilePicture: usersPageStyles.profilePicture,
  loadingText: usersPageStyles.loadingText,
});