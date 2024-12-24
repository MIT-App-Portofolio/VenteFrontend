import { Text, View } from "react-native";
import { useApi } from "@/api";
import * as yup from 'yup';
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BtnPrimary, CenterAligned, ErrorText, StyledTextInput } from "@/components/ThemedComponents";
import React from "react";

export default function Profile() {
  const api = useApi();

  const schema = yup.object().shape({
    name: yup.string().required(),
    description: yup.string().required(),
    ig: yup.string().required(),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: api.user_profile?.name || '',
      description: api.user_profile?.description || '',
      ig: api.user_profile?.igHandle || '',
    },
  });

  const onPressSend = async (data: any) => {
    await api.updateProfile(data);
  };

  return (
    <CenterAligned>
      <View style={{ width: '60%' }}>
        <Text style={{
          color: 'white'
        }}>@{api.user_profile!.userName as string}</Text>

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Nombre' placeholder='' value={value} setValue={onChange} autoCapitalize='none'></StyledTextInput>
          )}
          name="name"
        />
        {errors.name && <ErrorText>{errors.name.message}</ErrorText>}

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Descripción' placeholder='' value={value} setValue={onChange} autoCapitalize='none'></StyledTextInput>
          )}
          name="description"
        />
        {errors.description && <ErrorText>{errors.description.message}</ErrorText>}

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, value } }) => (
            <StyledTextInput title='Instagram' placeholder='' value={value} setValue={onChange} autoCapitalize='none'></StyledTextInput>
          )}
          name="ig"
        />
        {errors.ig && <ErrorText>{errors.ig.message}</ErrorText>}

        <BtnPrimary title='Guardar' onClick={handleSubmit(onPressSend)}></BtnPrimary>
      </View>
    </CenterAligned>
  );
}