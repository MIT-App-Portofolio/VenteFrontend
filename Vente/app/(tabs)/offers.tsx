import { useApi } from "@/api";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText, ViewMoreThemedText } from "@/components/ThemedText";
import { dateShortDisplay } from "@/dateDisplay";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, RefreshControl, Linking, Dimensions, Image, Platform } from "react-native";
import FastImage from "react-native-fast-image";
import { StyledModal } from "@/components/StyledModal";
import { Feather } from '@expo/vector-icons';
import { CenterAligned } from "@/components/CenterAligned";
import { BtnPrimary } from "@/components/Buttons";
import { CustomOffer, EventPlace } from "@/api";
import Carousel from "react-native-reanimated-carousel";
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';

export const offerImageSize = 250;

export default function Offers() {
  const { api, customOffers } = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CustomOffer | null>(null);
  const [selectedEventPlace, setSelectedEventPlace] = useState<EventPlace | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'offer' | 'eventPlace' | 'qr' | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

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
    setModalType('offer');
    setIsModalVisible(true);
  };

  const handleEventPlaceClick = (eventPlace: EventPlace) => {
    setSelectedEventPlace(eventPlace);
    setModalType('eventPlace');
    setIsModalVisible(true);
  };

  const handleShowQr = async (offer: CustomOffer) => {
    setQrLoading(true);
    const [success, token] = await api.getCustomOfferQrToken(offer);
    if (success && token) {
      setQrToken(token);
      setModalType('qr');
    } else {
      setErrorText("No se pudo generar el código QR. Por favor, intenta de nuevo.");
    }
    setQrLoading(false);
  };

  // Add useEffect to handle QR token refresh
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (modalType === 'qr' && selectedOffer) {
      // Refresh token every 2 minutes
      interval = setInterval(async () => {
        const [success, token] = await api.getCustomOfferQrToken(selectedOffer);
        if (success && token) {
          setQrToken(token);
        }
      }, 120000); // 2 minutes in milliseconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [modalType, selectedOffer]);

  // Add useEffect to fetch new token when QR modal is opened
  useEffect(() => {
    if (modalType === 'qr' && selectedOffer) {
      handleShowQr(selectedOffer);
    }
  }, [modalType]);

  if (loading) {
    return <FullScreenLoading></FullScreenLoading>
  }

  const renderModalContent = () => {
    switch (modalType) {
      case 'offer':
        return (
          <ScrollView style={styles.modalContent}>
            <View style={{ position: 'relative' }}>
              <FastImage
                source={{ uri: selectedOffer?.imageUrl || selectedOffer?.place.imageUrls[0] }}
                style={styles.modalOfferImage}
              />
              {selectedOffer?.validUntil && (
                <View style={styles.modalValidUntilContainer}>
                  <Feather name='clock' size={16} color='white' />
                  <ThemedText style={{ marginLeft: 5 }}>
                    Válido hasta {dateShortDisplay(selectedOffer.validUntil)}
                  </ThemedText>
                </View>
              )}
            </View>


            <View style={{ marginTop: 20 }}>
              <ThemedText type="title">{selectedOffer?.name}</ThemedText>

              {selectedOffer?.description && (
                <ThemedText style={{ marginTop: 10 }}>{selectedOffer.description}</ThemedText>
              )}

              <View style={{ marginTop: 20 }}>
                <BtnPrimary
                  title={qrLoading ? "Cargando..." : "Mostrar QR"}
                  onClick={() => handleShowQr(selectedOffer!)}
                />
              </View>

              <View style={styles.modalEventPlacePreview}>
                <ThemedText type="subtitle" style={{ marginBottom: 10 }}>En:</ThemedText>
                <TouchableOpacity
                  style={styles.modalEventPlaceCard}
                  onPress={() => {
                    setModalType('eventPlace');
                    setSelectedEventPlace(selectedOffer?.place || null);
                  }}
                >
                  <FastImage
                    source={{ uri: selectedOffer?.place.imageUrls[0] }}
                    style={styles.eventPlaceImage}
                  />

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <ThemedText type="subtitle">{selectedOffer?.place.name}</ThemedText>
                    {selectedOffer?.place.priceRangeBegin && selectedOffer?.place.priceRangeEnd && (
                      <ThemedText style={styles.priceRange}>
                        {selectedOffer.place.priceRangeBegin}€ - {selectedOffer.place.priceRangeEnd}€
                      </ThemedText>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );
      case 'eventPlace':
        return (
          <ScrollView>
            <CenterAligned>
              <Carousel
                loop
                width={screenWidth * 0.9}
                height={200}
                autoPlay={true}
                data={selectedEventPlace?.imageUrls || []}
                renderItem={({ item }) => (
                  <FastImage
                    source={{ uri: item }}
                    style={{ width: '100%', height: 200 }}
                  />
                )}
              />
            </CenterAligned>

            <ThemedText type="title">{selectedEventPlace?.name}</ThemedText>

            {selectedEventPlace?.ageRequirement && (
              <View style={{ alignSelf: 'flex-start', borderRadius: 5, borderColor: 'white', borderWidth: 1, paddingRight: 3, paddingLeft: 3, marginTop: 5 }}>
                <ThemedText>+{selectedEventPlace.ageRequirement}</ThemedText>
              </View>
            )}

            <ThemedText style={{ marginTop: 5 }}>{selectedEventPlace?.priceRangeBegin}€ - {selectedEventPlace?.priceRangeEnd}€</ThemedText>

            {selectedEventPlace?.description &&
              <ViewMoreThemedText style={{ marginTop: 5 }} maxLines={3}>
                {selectedEventPlace?.description}
              </ViewMoreThemedText>
            }

            {selectedEventPlace?.googleMapsLink && (
              <View style={{ marginTop: 20 }}>
                <BtnPrimary title="Abrir en mapas" onClick={() => Linking.openURL(selectedEventPlace.googleMapsLink!)} />
              </View>
            )}
          </ScrollView>
        );
      case 'qr':
        return (
          <View style={styles.qrModalContent}>
            <ThemedText type="title" style={{ marginBottom: 20 }}>Código QR</ThemedText>
            {qrToken ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrToken}
                  logo={require("../../assets/images/icon.png")}
                  size={screenWidth * 0.7}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <FullScreenLoading />
                <ThemedText style={{ marginTop: 20 }}>Generando código QR...</ThemedText>
              </View>
            )}
            <ThemedText style={{ marginTop: 20, textAlign: 'center' }}>
              Muestra este código QR al personal del establecimiento para canjear tu oferta
            </ThemedText>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <HorizontallyAligned>
      {errorText ? (
        <ThemedText>{errorText}</ThemedText>
      ) : (
        <View style={{ width: '100%', marginTop: Platform.OS === 'android' ? 30 : 0 }}>
          <Animated.ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal={false}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={{ paddingBottom: 50, width: '100%' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => {
                router.push('/');
              }}>
                <ThemedText style={styles.backButton}>←</ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText type='title' style={{ alignSelf: 'flex-start', marginTop: 10 }}>Ofertas disponibles</ThemedText>

            <View style={{ width: '100%', alignSelf: 'center', marginTop: 20 }}>
              {customOffers?.length === 0 && (
                <ThemedText>Aun no tienes ofertas disponibles</ThemedText>
              )}

              {customOffers?.map((offer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.offerCard}
                  onPress={() => handleOfferClick(offer)}
                >
                  <View style={styles.offerHeader}>
                    <FastImage
                      source={{ uri: offer.place.imageUrls[0] }}
                      style={styles.venueImage}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <ThemedText type="subtitle">{offer.place.name}</ThemedText>
                      {offer.validUntil && (
                        <ThemedText style={{ fontSize: 12, color: '#ffffff7f' }}>
                          Válido hasta {dateShortDisplay(offer.validUntil)}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  {(offer.imageUrl || (offer.place.imageUrls && offer.place.imageUrls.length > 0)) ? (
                    <FastImage
                      source={{ uri: offer.imageUrl || offer.place.imageUrls[0] }}
                      style={styles.offerImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noImageContainer}>
                      <Feather name="image" size={40} color="#ffffff7f" />
                    </View>
                  )}

                  <View style={styles.offerContent}>
                    <ThemedText type="subtitle">{offer.name}</ThemedText>
                    {offer.description && (
                      <ThemedText style={{ marginTop: 5, color: '#ffffff7f' }}>
                        {offer.description}
                      </ThemedText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.ScrollView>

          <StyledModal
            isModalVisible={isModalVisible}
            setIsModalVisible={setIsModalVisible}
          >
            {renderModalContent()}
          </StyledModal>
        </View >
      )
      }
    </HorizontallyAligned >
  );
}

const styles = StyleSheet.create({
  offerCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    overflow: 'hidden',
    marginBottom: 15,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1A1A1A',
  },
  venueImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  offerImage: {
    width: '100%',
    height: 250,
  },
  noImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    padding: 15,
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
    width: 80,
    height: 80,
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
  qrModalContent: {
    backgroundColor: 'black',
    padding: 20,
    marginTop: 80,
    borderRadius: 10,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    fontSize: 24,
    color: 'white',
  },
});