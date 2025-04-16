import { View, ScrollView, Platform, KeyboardAvoidingView, TouchableOpacity, Dimensions, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { useApi } from "@/api";
import * as yup from 'yup';
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BiggerMarginItem, MarginItem } from '@/components/MarginItem';
import { StyledTextInput } from '@/components/StyledInput';
import { ErrorText, ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { CenterAligned } from '@/components/CenterAligned';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import React, { useEffect, useState } from "react";
import CropPicker from 'react-native-image-crop-picker';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import FastImage from "react-native-fast-image";
import { redirectStore } from "@/redirect_storage";
import { Feather, Ionicons, FontAwesome } from "@expo/vector-icons";
import emitter from "@/eventEmitter";
import { StyledModal } from "@/components/StyledModal";
import { dateShortDisplay, timeShortDisplay } from '@/dateDisplay';
import { SharedAlbum } from '@/api';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const { height } = Dimensions.get('window');
const topBarPercentage = 0.13;

export default function Profile() {
  redirectStore.resetPendingRedirect();

  const { api, userPfp, userProfile, sharedAlbums } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<SharedAlbum | null>(null);
  const [albumPictures, setAlbumPictures] = useState<{ [key: number]: React.ReactElement | null }>({});
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [savingPicture, setSavingPicture] = useState<number | null>(null);
  const [sharingPicture, setSharingPicture] = useState<number | null>(null);
  const [savedPictures, setSavedPictures] = useState<number[]>([]);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [savingSuccess, setSavingSuccess] = useState<string | null>(null);

  const [settingsScreen, setSettingsScreen] = useState(false);
  const [deleteConfirmScreen, setDeleteConfirmScreen] = useState(false);
  const [logoutConfirmScreen, setLogoutConfirmScreen] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);

  const [customNoteEditing, setCustomNoteEditing] = useState(false);
  const [customNotePrompt, setCustomNotePrompt] = useState(false);
  const [customNote, setCustomNote] = useState(userProfile?.note);

  useEffect(() => {
    api.getAlbums();
  }, [userProfile?.eventStatus]);

  const schema = yup.object().shape({
    name: yup.string().max(35, "El nombre no puede ser mas largo de 35 caracteres"),
    description: yup.string().max(200, "La descripción debe de contener menos de 200 caracteres."),
    igHandle: yup.string().max(30, "Su instagram no puede contener mas de 30 caracteres."),
  });

  const getDefaultValues = () => {
    return {
      name: userProfile?.name || '',
      description: userProfile?.description || '',
      igHandle: userProfile?.igHandle || '',
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues()
  });

  useEffect(() => {
    reset(getDefaultValues());
  }, [userProfile]);

  useEffect(() => {
    const loadAlbumPictures = async () => {
      if (!selectedAlbum) return;

      const pictures: { [key: number]: React.ReactElement | null } = {};
      for (const picture of selectedAlbum.pictures) {
        await api.fetchPfp(picture.uploader);
        const component = await api.getPictureStream(selectedAlbum.id, picture.id);
        pictures[picture.id] = component;
      }
      setAlbumPictures(pictures);
    };

    loadAlbumPictures();
  }, [selectedAlbum]);

  const onPressSend = async (data: any) => {
    setLoading(true);
    if (data.igHandle) {
      data.igHandle = data.igHandle.replace(/^@/, '');
    }

    if (!await api.updateProfile(data)) {
      setEditProfileError("Ha sucedido un error desconocido");
    } else {
      setEditProfileError(null);
      setEditProfileModal(false);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    setLoading(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Se necesita permiso para acceder a la galería');
      setLoading(false);
      return;
    }

    let manipulatedImage = null;

    if (Platform.OS == 'android') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const localUri = result.assets[0].uri;

        let manipulator = ImageManipulator.manipulate(localUri);

        manipulatedImage = await (await manipulator.renderAsync()).saveAsync(
          { compress: 0.8, format: SaveFormat.JPEG }
        );
      }
    } else {
      let result = null;
      try {
        result = await CropPicker.openPicker({
          width: 500,
          height: 500,
          compressImageQuality: 0.8,
          mediaType: 'photo',
          cropping: true
        });
      } catch (e: any) {
        if (e.code == 'E_CANNOT_SAVE_IMAGE' || e.code == 'E_NO_IMAGE_DATA_FOUND') {
          setError('La imagen no se pudo acceder. Si esta en iCloud, descargue la imagen y vuelva a intentar.');
        }
        setLoading(false);
        return;
      }

      if (result.sourceURL) {
        let manipulator = ImageManipulator.manipulate(result.sourceURL).crop({
          width: result.cropRect!.width,
          height: result.cropRect!.height,
          originX: result.cropRect!.x,
          originY: result.cropRect!.y,
        }).resize({ width: 600, height: 600 });

        manipulatedImage = await (await manipulator.renderAsync()).saveAsync(
          { compress: 0.8, format: SaveFormat.JPEG }
        );
      }
    }

    if (manipulatedImage) {
      const success = await api.updateProfilePicture(manipulatedImage.uri);
      if (success) {
        setError(null);
      } else {
        setError("Ha sucedido un error desconocido");
      }
    }
    setLoading(false);
  };

  const savePicture = async (pictureId: number) => {
    if (!selectedAlbum) return;

    setSavingPicture(pictureId);
    setSavingError(null);
    setSavingSuccess(null);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesita permiso para guardar la imagen');
        return;
      }

      const blob = await api.fetchPictureBlob(selectedAlbum.id, pictureId);
      if (!blob) {
        setError('No se pudo obtener la imagen');
        return;
      }

      // Create filename with event time and picture ID
      const eventTime = selectedAlbum.eventTime.toISOString().split('T')[0];
      const tempFile = `${FileSystem.cacheDirectory}Vente_${eventTime}_${pictureId}.jpg`;

      // Convert blob to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write base64 to file
      await FileSystem.writeAsStringAsync(tempFile, base64.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(tempFile);
      await MediaLibrary.createAlbumAsync('Vente', asset, false);

      // Clean up
      await FileSystem.deleteAsync(tempFile);

      // Show success message
      setSavedPictures(prev => [...prev, pictureId]);
      setSavingSuccess('Imagen guardada correctamente');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSavingSuccess(null);
      }, 3000);
    } catch (error) {
      console.log('error', error);
      setSavingError('Error al guardar la imagen');
    } finally {
      setSavingPicture(null);
    }
  };

  const sharePicture = async (pictureId: number) => {
    if (!selectedAlbum) return;

    setSharingPicture(pictureId);
    try {
      const blob = await api.fetchPictureBlob(selectedAlbum.id, pictureId);
      if (!blob) {
        setError('No se pudo obtener la imagen');
        return;
      }

      // Create filename with event time and picture ID
      const eventTime = selectedAlbum.eventTime.toISOString().split('T')[0];
      const tempFile = `${FileSystem.cacheDirectory}Vente_${eventTime}_${pictureId}.jpg`;

      // Convert blob to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write base64 to file
      await FileSystem.writeAsStringAsync(tempFile, base64.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(tempFile);

      // Clean up
      await FileSystem.deleteAsync(tempFile);
    } catch (error) {
      console.log('error', error);
      setError('Error al compartir la imagen');
    } finally {
      setSharingPicture(null);
    }
  };

  if (loading) {
    return <FullScreenLoading />
  }

  if (deleteConfirmScreen) {
    return (
      <CenterAligned>
        <ThemedText type="subtitle">Estas seguro de que quieres eliminar tu cuenta?</ThemedText>

        <View style={{ flexDirection: 'column', gap: 8, width: '60%', marginTop: 15 }}>
          <BtnPrimary title="Eliminar" onClick={async () => { await api.deleteAccount(); emitter.emit('logout'); }} />
          <BtnSecondary title="Cancelar" onClick={() => { setDeleteConfirmScreen(false) }} />
        </View>
      </CenterAligned>);
  }

  if (logoutConfirmScreen) {
    return (
      <CenterAligned>
        <ThemedText type="subtitle">Estas seguro de que quieres cerrar sesión?</ThemedText>

        <View style={{ flexDirection: 'column', gap: 8, width: '60%', marginTop: 15 }}>
          <BtnPrimary title="Cerrar sesión" onClick={() => { api.logout(); emitter.emit('logout'); }} />
          <BtnSecondary title="Cancelar" onClick={() => { setLogoutConfirmScreen(false) }} />
        </View>
      </CenterAligned>);
  }

  return (
    <View>
      <StyledModal isModalVisible={customNoteEditing} setIsModalVisible={setCustomNoteEditing}>
        <StyledTextInput value={customNote ?? ""} setValue={setCustomNote} maxLength={50} placeholder="Pon algo..." />

        <View style={{ marginTop: 5 }}>
          <BtnPrimary title="Guardar" onClick={async () => {
            setLoading(true);
            await api.updateNote(customNote ?? "");
            setLoading(false);
            setCustomNoteEditing(false);
          }} />
        </View>
      </StyledModal>

      <StyledModal isModalVisible={customNotePrompt} setIsModalVisible={setCustomNotePrompt}>
        <CenterAligned>
          <ThemedText type="subtitle">¿Que quieres hacer con tu nota?</ThemedText>

          <View style={{ flexDirection: 'column', gap: 5, marginBottom: 10, marginTop: 10, alignSelf: 'stretch' }}>
            <BtnPrimary title="Cambiar" onClick={() => {
              setCustomNote(userProfile?.note);
              setCustomNoteEditing(true);
              setCustomNotePrompt(false);
            }} />
            <BtnSecondary title="Eliminar" onClick={async () => {
              setLoading(true);
              setCustomNoteEditing(false);
              setCustomNotePrompt(false);
              await api.removeNote();
              setLoading(false);
            }} />
          </View>
        </CenterAligned>
      </StyledModal>

      <StyledModal isModalVisible={editProfileModal} setIsModalVisible={setEditProfileModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView style={{ flex: 1 }}>
            <MarginItem>
              <Controller
                control={control}
                render={({ field: { onChange, value } }) => (
                  <StyledTextInput title='Nombre' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
                )}
                name="name"
              />
              {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
            </MarginItem>

            <MarginItem>
              <Controller
                control={control}
                render={({ field: { onChange, value } }) => (
                  <StyledTextInput title='Descripción' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
                )}
                name="description"
              />
              {errors.description && <ErrorText>{errors.description.message}</ErrorText>}
            </MarginItem>

            <MarginItem>
              <Controller
                control={control}
                render={({ field: { onChange, value } }) => (
                  <StyledTextInput title='Instagram' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
                )}
                name="igHandle"
              />
              {errors.igHandle && <ErrorText>{errors.igHandle.message}</ErrorText>}
            </MarginItem>

            <BiggerMarginItem>
              {editProfileError && <ErrorText>{editProfileError}</ErrorText>}
              <BtnPrimary title="Guardar cambios" onClick={handleSubmit(onPressSend)} disabled={!isDirty} />
            </BiggerMarginItem>
          </ScrollView>
        </KeyboardAvoidingView>
      </StyledModal>

      <StyledModal isModalVisible={albumModalVisible} setIsModalVisible={setAlbumModalVisible}>
        <ScrollView style={{ flex: 1 }}>
          {selectedAlbum && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <ThemedText type="title">{api.getLocationName(selectedAlbum.locationId)}</ThemedText>
                <ThemedText style={{ marginLeft: 10, color: 'gray' }}>
                  {dateShortDisplay(selectedAlbum.eventTime)}
                </ThemedText>
              </View>

              {selectedAlbum.pictures.map((picture) => (
                <View key={picture.id} style={styles.albumPictureContainer}>
                  <View style={styles.pictureHeader}>
                    <FastImage
                      source={{ uri: api.getPfpUnstable(picture.uploader) }}
                      style={styles.picturePfp}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <ThemedText>@{picture.uploader}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: 'gray' }}>
                        {timeShortDisplay(picture.time)}
                      </ThemedText>
                    </View>
                  </View>
                  {albumPictures[picture.id]}
                  <View style={styles.pictureActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        savedPictures.includes(picture.id) && styles.savedButton
                      ]}
                      onPress={() => savePicture(picture.id)}
                      disabled={savingPicture === picture.id}
                    >
                      {savingPicture === picture.id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : savedPictures.includes(picture.id) ? (
                        <Feather name="check" size={20} color="white" />
                      ) : (
                        <Feather name="download" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => sharePicture(picture.id)}
                      disabled={sharingPicture === picture.id}
                    >
                      {sharingPicture === picture.id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Feather name="share-2" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {savingPicture === picture.id && savingError && (
                    <ErrorText style={{ marginTop: 5 }}>{savingError}</ErrorText>
                  )}
                  {savingPicture === picture.id && savingSuccess && (
                    <ThemedText style={{ marginTop: 5, color: '#4CAF50' }}>{savingSuccess}</ThemedText>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </StyledModal>

      {!deleteConfirmScreen &&
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: (height * topBarPercentage) / 2,
            left: settingsScreen ? 20 : undefined,
            right: settingsScreen ? undefined : 20,
            zIndex: 1,
          }}
          onPress={() => {
            setSettingsScreen(!settingsScreen);
          }}
        >
          {!settingsScreen ?
            <Feather name="settings" size={24} color='white' />
            :
            <Ionicons name="arrow-back" size={24} color='white' />
          }
        </TouchableOpacity>
      }

      <ScrollView
        contentContainerStyle={{ paddingBottom: 90, paddingTop: 70 }}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        horizontal={false}
      >
        <CenterAligned>
          <View style={{ width: '80%' }}>
            {settingsScreen ?
              (
                <View style={{ marginTop: 15, flexDirection: 'column', gap: 5, paddingTop: 50 }}>
                  <BtnPrimary title='Cerrar sesión' onClick={() => { setLogoutConfirmScreen(true); }} />
                  <BtnSecondary title='Eliminar cuenta' onClick={() => { setDeleteConfirmScreen(true); }} />
                </View>
              ) : (
                <View>
                  <View style={{ position: 'relative' }}>
                    <TouchableOpacity onPress={pickImage}>
                      {userPfp && <FastImage source={{ uri: userPfp }} style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: 15 }} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => userProfile?.note ? setCustomNotePrompt(true) : setCustomNoteEditing(true)}
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        backgroundColor: '#2A2A2A',
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#3A3A3A',
                      }}
                    >
                      <ThemedText style={{ fontSize: 14, maxWidth: 140 }}>
                        {userProfile?.note || "Añade una nota..."}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                    {userProfile?.name &&
                      <ThemedText style={{ marginRight: 10 }} type="title">{userProfile.name}</ThemedText>
                    }
                    <ThemedText style={{ color: 'gray' }}>@{userProfile?.userName}</ThemedText>
                  </View>

                  {
                    (userProfile?.eventStatus.time || userProfile?.years) &&
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 5 }}>
                      {userProfile?.years &&
                        <ThemedText>{userProfile.years} años</ThemedText>
                      }

                      {userProfile?.eventStatus.time &&
                        <View style={{
                          flexDirection: 'row',
                          gap: 2,
                          alignItems: 'center',
                        }}>
                          <Feather name='calendar' size={16} color='white' />
                          <ThemedText>{dateShortDisplay(new Date(userProfile?.eventStatus.time!))}</ThemedText>
                        </View>
                      }
                    </View>
                  }

                  {userProfile?.description &&
                    <ThemedText style={{ marginTop: 5 }}>{userProfile?.description}</ThemedText>
                  }

                  {userProfile?.igHandle && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                      <FontAwesome name="instagram" size={16} color="white" />
                      <ThemedText type="link" style={{ marginLeft: 3 }} onPress={() => Linking.openURL(`https://www.instagram.com/${userProfile.igHandle}`)} numberOfLines={1} ellipsizeMode='tail'>
                        {userProfile.igHandle}
                      </ThemedText>
                    </View>
                  )}

                  <View style={{ marginTop: 20, flexDirection: 'column', gap: 5 }}>
                    {error && <ErrorText>{error}</ErrorText>}
                    <BtnPrimary title="Editar perfil" onClick={() => setEditProfileModal(true)} />
                  </View>

                  {sharedAlbums && sharedAlbums.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                      <ThemedText type="title">Álbumes</ThemedText>
                      {sharedAlbums.map((album) => (
                        <TouchableOpacity
                          key={album.id}
                          style={styles.albumCard}
                          onPress={() => {
                            setSelectedAlbum(album);
                            setAlbumModalVisible(true);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText>{api.getLocationName(album.locationId)}</ThemedText>
                            <ThemedText style={{ marginLeft: 10, color: 'gray' }}>
                              {dateShortDisplay(album.eventTime)}
                            </ThemedText>
                          </View>
                          <ThemedText style={{ color: 'gray' }}>
                            {album.pictures.length} fotos
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )
            }
          </View>
        </CenterAligned>
      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  albumCard: {
    backgroundColor: 'black',
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  albumPictureContainer: {
    marginBottom: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    overflow: 'hidden',
  },
  pictureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1A1A1A',
  },
  picturePfp: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pictureActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  savedButton: {
    backgroundColor: '#4CAF50',
  },
});