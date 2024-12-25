import { Text, View, Image, Button } from "react-native";
import { useApi } from "@/api";
import * as yup from 'yup';
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { CenterAligned, ErrorText, StyledTextInput } from "@/components/ThemedComponents";
import React, { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { Picker } from "@react-native-picker/picker";

export default function Profile() {
  const api = useApi();
  const [image, setImage] = useState(api.profilePicture);

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
    await api.updateProfile(data);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename!);
      const type = match ? `image/${match[1]}` : `image`;

      const file = new File([await (await fetch(localUri)).blob()], filename!, { type });

      const success = await api.updateProfilePicture(file);
      if (success) {
        setImage(api.profilePicture);
      }
    }
  };

  return (
    <CenterAligned>
      <View style={{ width: '60%' }}>
        <Text style={{ color: 'white' }}>@{api.userProfile!.userName as string}</Text>

        {image && <Image source={{ uri: image }} style={{ width: 100, height: 100, borderRadius: 50 }} />}
        <Button title="Change Profile Picture" onPress={pickImage} />

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

        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
            >
              <Picker.Item label="Hombre" value={0} />
              <Picker.Item label="Mujer" value={1} />
            </Picker>
          )}
          name="gender"
        />
        {errors.gender && <ErrorText>{errors.gender.message}</ErrorText>}

        <Button title="Send" onPress={handleSubmit(onPressSend)} />
      </View>
    </CenterAligned>
  );
}