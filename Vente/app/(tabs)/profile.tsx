import { View, ScrollView, Platform, KeyboardAvoidingView, TouchableOpacity, Dimensions } from "react-native";
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
import { StyledGenderPicker } from "@/components/GenderPicker";
import FastImage from "react-native-fast-image";
import { redirectStore } from "@/redirect_storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import emitter from "@/eventEmitter";

const { height } = Dimensions.get('window');
const topBarPercentage = 0.13;

export default function Profile() {
  // another hack. too fucking bad
  redirectStore.resetPendingRedirect();

  const { api, userPfp, userProfile } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsScreen, setSettingsScreen] = useState(false);
  const [deleteConfirmScreen, setDeleteConfirmScreen] = useState(false);
  const [logoutConfirmScreen, setLogoutConfirmScreen] = useState(false);

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

  const onPressSend = async (data: any) => {
    setLoading(true);
    if (data.igHandle) {
      data.igHandle = data.igHandle.replace(/^@/, '');
    }

    if (!await api.updateProfile(data)) {
      setError("Ha sucedido un error desconocido");
    } else {
      setError(null);
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
      } catch (e) {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90, paddingTop: 60 }}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        horizontal={false}
      >
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
                  <View style={{ marginBottom: 20, alignItems: 'center', width: '100%' }}>
                    <ThemedText type="title">@{userProfile?.userName as string}</ThemedText>
                  </View>

                  <MarginItem>
                    {userPfp && <FastImage source={{ uri: userPfp }} style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: 5 }} />}

                    <BtnSecondary title="Cambiar foto de perfil" onClick={pickImage} />
                  </MarginItem>

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
                    {error && <ErrorText>{error}</ErrorText>}
                    <BtnPrimary title="Guardar cambios" onClick={handleSubmit(onPressSend)} disabled={!isDirty} />
                  </BiggerMarginItem>
                </View>
              )
            }
          </View>
        </CenterAligned>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}