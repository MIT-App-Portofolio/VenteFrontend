import { Text, View, Image, Button } from "react-native";
import { useApi } from "@/api";
import * as yup from 'yup';
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BtnPrimary, BtnSecondary, CenterAligned, ErrorText, FullScreenLoading, StyledTextInput } from "@/components/ThemedComponents";
import React, { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { Picker } from "@react-native-picker/picker";
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export default function Profile() {
  const api = useApi();
  const [image, setImage] = useState(api.profilePicture);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = yup.object().shape({
    name: yup.string(),
    description: yup.string(),
    igHandle: yup.string(),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1], 'Género inválido'),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: api.userProfile?.name || '',
      description: api.userProfile?.description || '',
      igHandle: api.userProfile?.igHandle || '',
      gender: api.userProfile?.gender || 0,
    },
  });

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
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;

      const manipulatedImage = await manipulateAsync(
        localUri,
        [],
        { compress: 1, format: SaveFormat.JPEG }
      );

      const filename = manipulatedImage.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename!);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const file = new File([await (await fetch(manipulatedImage.uri)).blob()], filename!, { type });

      const success = await api.updateProfilePicture(file);
      if (success) {
        setImage(api.profilePicture);
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
    <CenterAligned>
      <View style={{ width: '60%' }}>
        {image && <Image source={{ uri: image }} style={{ width: '100%', height: undefined, aspectRatio: 1 }} />}

        <BtnSecondary title="Cambiar foto de perfil" onClick={pickImage} />

        <Text style={{ color: 'white', fontSize: 15 }}>@{api.userProfile!.userName as string}</Text>


        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={{ color: 'white', marginBottom: 20, backgroundColor: 'black', borderColor: 'white', borderWidth: 1 }}
            >
              <Picker.Item label="Hombre" value={0} />
              <Picker.Item label="Mujer" value={1} />
            </Picker>
          )}
          name="gender"
        />
        {errors.gender && <ErrorText>{errors.gender.message}</ErrorText>}

        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Nombre' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
          )}
          name="name"
        />
        {errors.name && <ErrorText>{errors.name.message}</ErrorText>}

        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Descripción' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
          )}
          name="description"
        />
        {errors.description && <ErrorText>{errors.description.message}</ErrorText>}

        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Instagram' placeholder='' value={value || ''} setValue={onChange} autoCapitalize='none' />
          )}
          name="igHandle"
        />
        {errors.igHandle && <ErrorText>{errors.igHandle.message}</ErrorText>}

        {error && <ErrorText>{error}</ErrorText>}
        <BtnPrimary title="Guardar cambios" onClick={handleSubmit(onPressSend)} />
      </View>
    </CenterAligned>
  );
}