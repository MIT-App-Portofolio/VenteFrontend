import { useApi } from "@/api";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText } from "@/components/ThemedText";
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Image } from "react-native";
import { StyledModal } from "@/components/StyledModal";
import { CenterAligned } from "@/components/CenterAligned";
import { BtnPrimary } from "@/components/Buttons";
import { CustomOffer } from "@/api";
import QRCode from 'react-native-qrcode-svg';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { useEffect, useState } from "react";

export default function Affiliate() {
  const { api } = useApi();
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CustomOffer | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'offer' | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      const [success, result] = await api.getQrTokenInfo(data);
      if (success) {
        setSelectedOffer(result as CustomOffer);
        setModalType('offer');
        setIsModalVisible(true);
      } else {
        setErrorText(result as string);
      }
    } catch (e) {
      setErrorText("Error al escanear el código QR");
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <FullScreenLoading />;
  }

  if (hasPermission === false) {
    return (
      <CenterAligned>
        <ThemedText>No se ha concedido permiso para acceder a la cámara</ThemedText>
      </CenterAligned>
    );
  }

  const renderModalContent = () => {
    if (modalType === 'offer' && selectedOffer) {
      return (
        <ScrollView style={styles.modalContent}>
          <View style={{ position: 'relative' }}>
            {selectedOffer.imageUrl && (
              <Image
                source={{ uri: selectedOffer.imageUrl }}
                style={styles.modalOfferImage}
              />
            )}
          </View>

          <View style={{ marginTop: 20 }}>
            <ThemedText type="title">{selectedOffer.name}</ThemedText>

            {selectedOffer.description && (
              <ThemedText style={{ marginTop: 10 }}>{selectedOffer.description}</ThemedText>
            )}

            <View style={styles.modalEventPlacePreview}>
              <ThemedText type="subtitle" style={{ marginBottom: 10 }}>En:</ThemedText>
              <View style={styles.modalEventPlaceCard}>
                {selectedOffer.place.imageUrls[0] && (
                  <Image
                    source={{ uri: selectedOffer.place.imageUrls[0] }}
                    style={styles.modalEventPlaceImage}
                  />
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <ThemedText type="subtitle">{selectedOffer.place.name}</ThemedText>
                  {selectedOffer.place.priceRangeBegin && selectedOffer.place.priceRangeEnd && (
                    <ThemedText style={styles.priceRange}>
                      {selectedOffer.place.priceRangeBegin}€ - {selectedOffer.place.priceRangeEnd}€
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <HorizontallyAligned>
      <View style={styles.container}>
        {!cameraOpen && (
          <CenterAligned>
            <BtnPrimary
              title="Abrir cámara"
              onClick={() => setCameraOpen(true)}
            />
          </CenterAligned>
        )}

        {cameraOpen && !scanned && !errorText && (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
          </View>
        )}

        {scanned && (
          <View style={styles.scanAgainContainer}>
            <BtnPrimary
              title="Escanear de nuevo"
              onClick={() => {
                setScanned(false);
                setCameraOpen(true);
              }}
            />
          </View>
        )}

        {errorText && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{errorText}</ThemedText>
            <BtnPrimary
              title="Intentar de nuevo"
              onClick={() => {
                setErrorText(null);
                setScanned(false);
                setCameraOpen(true);
              }}
            />
          </View>
        )}

        <StyledModal
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
        >
          {renderModalContent()}
        </StyledModal>
      </View>
    </HorizontallyAligned>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scanAgainContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
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
  priceRange: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
}); 