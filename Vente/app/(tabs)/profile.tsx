import { View, ScrollView, Platform } from "react-native";
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

export default function Profile() {
  const { api, userPfp, userProfile } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = yup.object().shape({
    name: yup.string(),
    description: yup.string(),
    igHandle: yup.string(),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1], 'Género inválido'),
  });

  const getDefaultValues = () => {
    return {
      name: userProfile?.name || '',
      description: userProfile?.description || '',
      igHandle: userProfile?.igHandle,
      gender: userProfile?.gender || 0,
    };
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
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
      } catch {
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

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 90, paddingTop: 60 }}>
      <CenterAligned>
        <View style={{ width: '80%' }}>
          <View style={{ marginBottom: 20, alignItems: 'center', width: '100%' }}>
            <ThemedText type="title">@{userProfile?.userName as string}</ThemedText>
          </View>

          <MarginItem>
            {userPfp && <FastImage source={{ uri: userPfp }} style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: 5 }} />}

            <BtnSecondary title="Cambiar foto de perfil" onClick={pickImage} />
          </MarginItem>

          <StyledGenderPicker gender={watch("gender")} control={control} errorsGender={errors.gender} />

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
      </CenterAligned>
    </ScrollView>
  );
}