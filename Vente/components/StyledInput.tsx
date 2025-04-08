import React from 'react';
import { TextInputProps, View, TextInput } from 'react-native';
import { ThemedText } from './ThemedText';

interface StyledTextInputProps extends TextInputProps {
  title?: string;
  value: string;
  setValue: (e: string) => void;
}

export function StyledTextInput({ title, placeholder, value, setValue, autoCapitalize, secureTextEntry, maxLength }: StyledTextInputProps) {
  return (
    <View>
      <ThemedText>{title as string}</ThemedText>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor='white' autoCapitalize={autoCapitalize} secureTextEntry={secureTextEntry} maxLength={maxLength}
        style={{
          padding: 10,
          borderColor: 'white',
          color: 'white',
          fontSize: 15,
          borderWidth: 1,
          borderRadius: 4,
        }}
      ></TextInput>
    </View>
  );
}

export function StyledEmailInput({ value, setValue }: StyledTextInputProps) {
  return (
    <StyledTextInput title='Email' value={value} setValue={setValue} placeholder='user@example.com' autoCapitalize='none' autoCorrect={false} placeholderTextColor='gray'></StyledTextInput>
  );
}

export function StyledPasswordInput({ title, value, setValue }: StyledTextInputProps) {
  return (
    <StyledTextInput title={title} value={value} setValue={setValue} secureTextEntry autoCapitalize='none' autoCorrect={false}></StyledTextInput>
  );
}
