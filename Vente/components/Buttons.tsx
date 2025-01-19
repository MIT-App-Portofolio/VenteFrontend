import React from 'react';
import { TouchableOpacity, Text, Image } from 'react-native';

type ButtonProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
};

export function BtnPrimary({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: disabled ? 'gray' : 'white',
      padding: 10,
      borderRadius: 5,
    }} disabled={disabled}>
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
}
;

export function BtnSecondary({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'black',
      padding: 10,
      borderRadius: 5,
      borderColor: 'white',
      borderWidth: 2,
    }} disabled={disabled}>
      <Text style={{ color: 'white', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function GoogleButton({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'white',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 5,
    }} disabled={disabled}>
      <Image source={require('../assets/images/google-logo.png')} style={{ width: 20, height: 20, marginRight: 5 }} />
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
}
