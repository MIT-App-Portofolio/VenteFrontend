import React from 'react';
import { TouchableOpacity, Text, Image, ViewStyle } from 'react-native';

type ButtonProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function BtnPrimary({ title, onClick, disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={[{
      backgroundColor: disabled ? 'gray' : 'white',
      padding: 10,
      borderRadius: 5,
    }, style]} disabled={disabled}>
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function BtnSecondary({ title, onClick, disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={[{
      backgroundColor: 'black',
      padding: 10,
      borderRadius: 5,
      borderColor: 'white',
      borderWidth: 2,
    }, style]} disabled={disabled}>
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

export function AppleButton({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'white',
      flexDirection: 'row',
      alignItems: 'center',
      // hack, but it's only used in one place so who gaf
      marginTop: 5,
      padding: 10,
      borderRadius: 5,
    }} disabled={disabled}>
      <Image source={require('../assets/images/apple-logo.png')} style={{ width: 20, height: 20, marginRight: 5 }} />
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
}
