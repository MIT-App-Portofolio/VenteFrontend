import { useApi } from "@/api";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText, ViewMoreThemedText } from "@/components/ThemedText";
import { dateShortDisplay } from "@/dateDisplay";
import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, RefreshControl, Linking, Dimensions, Image } from "react-native";
import FastImage from "react-native-fast-image";
import { StyledModal } from "@/components/StyledModal";
import { Feather } from '@expo/vector-icons';
import { CenterAligned } from "@/components/CenterAligned";
import { BtnPrimary } from "@/components/Buttons";
import { CustomOffer, EventPlace } from "@/api";
import Carousel from "react-native-reanimated-carousel";

export const offerImageSize = 250;

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

export default function Offers() {
  const { api, customOffers } = useApi();
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CustomOffer | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [isEventPlaceModalVisible, setIsEventPlaceModalVisible] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const inner = async () => {
      if (customOffers == null) {
        setLoading(true);
        if (!await api.getCustomOffers()) {
          setErrorText("Algo fue mal");
        }
        setLoading(false);
      }
    };

    inner();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    if (!await api.getCustomOffers()) {
      setErrorText("Algo fue mal");
    }
    setRefreshing(false);
  };

  const handleOfferClick = (offer: CustomOffer) => {
    setSelectedOffer(offer);
    setIsOfferModalVisible(true);
  };

  const handleEventPlaceClick = (eventPlace: EventPlace) => {
    setSelectedEventPlace(eventPlace);
    setIsEventPlaceModalVisible(true);
  };

  if (loading) {
    return <FullScreenLoading></FullScreenLoading>
  }

  return (
    <HorizontallyAligned>
      {errorText ? (
        <ThemedText>{errorText}</ThemedText>
      ) : (
        <View style={{ width: '100%', padding: 20 }}>
          <Animated.ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal={false}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            <ThemedText type='title' style={{ alignSelf: 'flex-start', marginTop: 10 }}>Ofertas disponibles</ThemedText>

            <CenterAligned>
              {customOffers?.length === 0 && (
                <ThemedText>Aun no hay ofertas disponibles</ThemedText>
              )}

              {customOffers?.map((offer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.offerCard}
                  onPress={() => handleOfferClick(offer)}
                >
                  {(offer.imageUrl || (offer.place.imageUrls && offer.place.imageUrls.length > 0)) ? (
                    <View style={{ position: 'relative' }}>
                      <FastImage
                        source={{ uri: offer.imageUrl || offer.place.imageUrls[0] }}
                        style={styles.offerImage}
                        resizeMode="cover"
                      />
                      {offer.validUntil && (
                        <View style={styles.validUntilContainer}>
                          <Feather name='clock' size={16} color='white' />
                          <ThemedText style={{ marginLeft: 5 }}>
                            Válido hasta {dateShortDisplay(offer.validUntil)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noImageContainer}>
                      <Feather name="image" size={40} color="#ffffff7f" />
                      {offer.validUntil && (
                        <View style={styles.validUntilContainer}>
                          <Feather name='clock' size={16} color='white' />
                          <ThemedText style={{ marginLeft: 5 }}>
                            Válido hasta {dateShortDisplay(offer.validUntil)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                  <ThemedText type="subtitle" style={{ marginTop: 5 }}>{offer.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </CenterAligned>
          </Animated.ScrollView>

          {/* Offer Modal */}
          {selectedOffer && (
            <StyledModal
              isModalVisible={isOfferModalVisible}
              setIsModalVisible={setIsOfferModalVisible}
            >
              <ScrollView style={styles.modalContent}>
                <View style={{ position: 'relative' }}>
                  <FastImage
                    source={{ uri: selectedOffer.imageUrl || selectedOffer.place.imageUrls[0] }}
                    style={styles.modalOfferImage}
                  />
                  {selectedOffer.validUntil && (
                    <View style={styles.modalValidUntilContainer}>
                      <Feather name='clock' size={16} color='white' />
                      <ThemedText style={{ marginLeft: 5 }}>
                        Válido hasta {dateShortDisplay(selectedOffer.validUntil)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: 20 }}>
                  <ThemedText type="title">{selectedOffer.name}</ThemedText>

                  {selectedOffer.description && (
                    <ThemedText style={{ marginTop: 10 }}>{selectedOffer.description}</ThemedText>
                  )}

                  <View style={styles.modalEventPlacePreview}>
                    <ThemedText type="subtitle" style={{ marginBottom: 10 }}>En:</ThemedText>
                    <TouchableOpacity
                      style={styles.modalEventPlaceCard}
                      onPress={() => {
                        setIsOfferModalVisible(false);
                        handleEventPlaceClick(selectedOffer.place);
                      }}
                    >
                      <FastImage
                        source={{ uri: selectedOffer.place.imageUrls[0] }}
                        style={styles.modalEventPlaceImage}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <ThemedText type="subtitle">{selectedOffer.place.name}</ThemedText>
                        {selectedOffer.place.priceRangeBegin && selectedOffer.place.priceRangeEnd && (
                          <ThemedText style={styles.priceRange}>
                            {selectedOffer.place.priceRangeBegin}€ - {selectedOffer.place.priceRangeEnd}€
                          </ThemedText>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </StyledModal>
          )}

          {/* Event Place Modal */}
          {selectedEventPlace && (
            <StyledModal
              isModalVisible={isEventPlaceModalVisible}
              setIsModalVisible={setIsEventPlaceModalVisible}
            >
              <ScrollView>
                <CenterAligned>
                  <Carousel
                    loop
                    width={screenWidth * 0.9}
                    height={200}
                    autoPlay={true}
                    data={selectedEventPlace.imageUrls}
                    renderItem={({ item }) => (
                      <FastImage
                        source={{ uri: item }}
                        style={{ width: '100%', height: 200 }}
                      />
                    )}
                  />
                </CenterAligned>

                <ThemedText type="title">{selectedEventPlace.name}</ThemedText>

                {selectedEventPlace.ageRequirement && (
                  <View style={{ alignSelf: 'flex-start', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3, marginTop: 5 }}>
                    <ThemedText>+{selectedEventPlace.ageRequirement}</ThemedText>
                  </View>
                )}

                <ThemedText style={{ marginTop: 5 }}>{selectedEventPlace.priceRangeBegin}€ - {selectedEventPlace.priceRangeEnd}€</ThemedText>

                <ViewMoreThemedText style={{ marginTop: 5 }} maxLines={3}>
                  {selectedEventPlace.description}
                </ViewMoreThemedText>

                {selectedEventPlace.googleMapsLink && (
                  <View style={{ marginTop: 20 }}>
                    <BtnPrimary title="Abrir en mapas" onClick={() => Linking.openURL(selectedEventPlace.googleMapsLink!)} />
                  </View>
                )}
              </ScrollView>
            </StyledModal>
          )}
        </View>
      )}
    </HorizontallyAligned>
  );
}

const styles = StyleSheet.create({
  offerCard: {
    backgroundColor: 'black',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    width: '100%',
  },
  offerImage: {
    width: offerImageSize,
    height: offerImageSize,
    borderRadius: 10,
  },
  validUntilContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRange: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
  modalContent: {
    backgroundColor: 'black',
    padding: 20,
    marginTop: 80,
    borderRadius: 10,
    width: '100%',
    height: '100%',
  },
  modalOfferImage: {
    width: '100%',
    borderRadius: 15,
    height: undefined,
    aspectRatio: 1,
  },
  modalValidUntilContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPlacePreview: {
    marginTop: 15,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ffffff7f',
    paddingTop: 15,
  },
  eventPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 5,
  },
  eventPlaceImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  modalEventPlacePreview: {
    marginTop: 20,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ffffff7f',
    paddingTop: 20,
  },
  modalEventPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 5,
  },
  modalEventPlaceImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  noImageContainer: {
    width: '100%',
    height: offerImageSize,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});