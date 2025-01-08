import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

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
;
