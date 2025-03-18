import { View, Image, ScrollView } from "react-native";
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
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { StyledGenderPicker } from "@/components/GenderPicker";

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

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;

      const manipulatedImage = await manipulateAsync(
        localUri,
        [],
        { compress: 1, format: SaveFormat.JPEG }
      );

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
            {userPfp && <Image source={{ uri: userPfp }} style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: 5 }} />}

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