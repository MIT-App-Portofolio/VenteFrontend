import { HorizontallyAligned } from "@/components/HorizontallyAligned";
import { ThemedText } from "@/components/ThemedText";
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native";
import { useApi } from "@/api";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { StyledModal } from "@/components/StyledModal";
import React, { useEffect, useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Feather } from "@expo/vector-icons";
import { timeShortDisplay } from "@/dateDisplay";

const { height } = Dimensions.get('window');

export default function Picture() {
  const { api, ownPictures } = useApi();
  const [loading, setLoading] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState<number | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pictureComponents, setPictureComponents] = useState<{ [key: number]: React.ReactElement | null }>({});

  const fetchPictures = async () => {
    setLoading(true);
    await api.getOwnPictures();
    setLoading(false);
  };

  useEffect(() => {
    fetchPictures();
  }, []);

  useEffect(() => {
    const loadPictureComponents = async () => {
      if (!ownPictures) return;

      const components: { [key: number]: React.ReactElement | null } = {};
      for (const picture of ownPictures.pictures) {
        const component = await api.getPictureStream(ownPictures.albumId, picture.id);
        if (component) {
          component.props.style.borderRadius = 15;
        }

        components[picture.id] = component;
      }
      setPictureComponents(components);
    };

    loadPictureComponents();
  }, [ownPictures]);

  const takePicture = async () => {
    setLoading(true);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setLoading(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      const manipulatedImage = await manipulateAsync(
        localUri,
        [{ resize: { width: 600, height: 600 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const success = await api.uploadPicture(manipulatedImage.uri);
      if (success) {
        await fetchPictures();
      }
    }

    setLoading(false);
  };

  const deletePicture = async () => {
    if (selectedPicture === null) return;

    setLoading(true);
    const success = await api.deletePicture(selectedPicture);
    if (success) {
      await fetchPictures();
    }
    setLoading(false);
    setDeleteConfirmVisible(false);
    setSelectedPicture(null);
  };

  if (loading) {
    return <FullScreenLoading />;
  }


  return (
    <>
      <StyledModal isModalVisible={deleteConfirmVisible} setIsModalVisible={setDeleteConfirmVisible}>
        <ThemedText type="subtitle">¿Estás seguro de que quieres eliminar esta foto?</ThemedText>
        <View style={{ flexDirection: 'column', gap: 8, marginTop: 15 }}>
          <BtnPrimary title="Eliminar" onClick={deletePicture} />
          <BtnSecondary title="Cancelar" onClick={() => setDeleteConfirmVisible(false)} />
        </View>
      </StyledModal>

      <HorizontallyAligned>
        <View style={{ flexDirection: 'column', justifyContent: 'space-between', paddingBottom: height * 0.08, marginTop: Platform.OS === 'android' ? 30 : 0 }}>
          <View>
            <ThemedText type="title" style={{ marginTop: 10, marginLeft: 10, textAlign: 'center' }}>Captura una memoria</ThemedText>
            <ThemedText style={{ marginTop: 10, marginLeft: 10, textAlign: 'center' }}>Estas fotos serán disponibles para tu y tu grupo después del evento.</ThemedText>
          </View>

          {ownPictures == null || ownPictures?.pictures.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ textAlign: 'center' }}>Aun no has sacado fotos.</ThemedText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
            >
              {ownPictures?.pictures.map((picture) => (
                <View key={picture.id} style={[styles.pictureContainer, { width: Dimensions.get('window').width * 0.9 }]}>
                  {pictureComponents[picture.id]}
                  <View style={styles.pictureInfo}>
                    <ThemedText>{timeShortDisplay(picture.time)}</ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPicture(picture.id);
                        setDeleteConfirmVisible(true);
                      }}
                    >
                      <Feather name="trash-2" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.cameraButton}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25 }} onPress={takePicture}>
              <Feather name="camera" size={24} color="black" />
              <ThemedText style={{ color: 'black' }}>Tomar una foto</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </HorizontallyAligned>
    </>
  );
}

const styles = StyleSheet.create({
  pictureContainer: {
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    height: '80%',
    alignSelf: 'center',
  },
  picture: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 15,
  },
  pictureInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cameraButton: {
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});