import { Link } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
}

type TosAcceptProps = {
  accepted: boolean;
  setAccepted: (boolean: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      width: 24, height: 24, borderWidth: 2, borderColor: 'white',
      borderRadius: 5,
      alignItems: 'center', justifyContent: 'center',
    }}>
    {checked && <Text style={{ fontSize: 16, color: 'blue' }}>✔</Text>}
  </TouchableOpacity>
);

export function TosAccept({ accepted, setAccepted }: TosAcceptProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      <Checkbox checked={accepted} onPress={() => setAccepted(!accepted)} />
      <Text style={{ marginLeft: 8, color: 'white' }}>Acepto que tengo más de 16 años y que leí y acepto los términos y la política de privacidad disponibles
        {' '}
        <Text
          style={{ color: '#007AFF', textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL('https://venteapp.es/Privacy')}
        >
          aquí
        </Text>
      </Text>
    </View>
  );
}