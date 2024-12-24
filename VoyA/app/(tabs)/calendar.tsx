import React, { useState } from "react";
import { Text, View, Button } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import { useApi } from "@/api";
import { CenterAligned, BtnPrimary, ErrorText, BtnSecondary } from "@/components/ThemedComponents";

export default function Calendar() {
  const api = useApi();
  const [picking, setPicking] = useState(api.user_profile?.eventStatus.active);
  const [selectedLocation, setSelectedLocation] = useState<number>(api.user_profile?.eventStatus.location?.id ?? 0);
  const [date, setDate] = useState(api.user_profile?.eventStatus.time ?? new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (selectedLocation == null) {
      setError("Escoge un lugar.");
      return;
    }

    const location = api.locations!.find(loc => loc.id == selectedLocation);
    const success = await api.registerEvent(location!, date);
    if (!success) {
      setError("No se pudo registrar el evento.");
    } else {
      setError(null);
    }
  };

  const onCancel = async () => {
    const success = await api.cancelEvent();
    if (!success) {
      setError("No se pudo cancelar el evento.");
    } else {
      setError(null);
    }
  };

  if (!picking) {
    return (
      <CenterAligned>
        <BtnPrimary title='Registrarte en un evento' onClick={() => setPicking(true)} />
      </CenterAligned>
    )
  }

  return (
    <CenterAligned>
      <View style={{ width: '80%' }}>
        <Text style={{ color: 'white', marginBottom: 10 }}>Escoge un lugar:</Text>
        <Picker
          selectedValue={selectedLocation}
          onValueChange={(itemValue, _) => setSelectedLocation(itemValue)}
          style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
        >
          {api.locations!.map(location => (
            <Picker.Item key={location.id} label={location.name} value={location.id} />
          ))}
        </Picker>

        <Text style={{ color: 'white', marginBottom: 10 }}>Select Date:</Text>
        <Button title="Escoge una fecha" onPress={() => setShowDatePicker(true)} />
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}
        <Text style={{ color: 'white', marginTop: 10 }}>{date.toString()}</Text>

        {error && <ErrorText>{error}</ErrorText>}

        <BtnPrimary title="Guardar" onClick={onSubmit} />

        {
          api.user_profile?.eventStatus.active &&
          <BtnSecondary title="Cancelar Evento" onClick={onCancel} />
        }

      </View>
    </CenterAligned>
  );
}