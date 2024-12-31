import React, { useState } from "react";
import { Text, View, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import { useApi } from "@/api";
import { CenterAligned, BtnPrimary, ErrorText, BtnSecondary, FullScreenLoading, MarginItem, BiggerMarginItem } from "@/components/ThemedComponents";

export default function Calendar() {
  const api = useApi();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<number>(api.userProfile?.eventStatus.location?.id ?? 0);
  const [date, setDate] = useState(api.userProfile?.eventStatus.time ?? new Date());
  const [isDirty, setIsDirty] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
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
    setLoading(false);
    setIsDirty(false);
  };

  const onCancel = async () => {
    setLoading(true);
    const success = await api.cancelEvent();
    if (!success) {
      setError("No se pudo cancelar el evento.");
    } else {
      setError(null);
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading></FullScreenLoading>
  }

  return (
    <CenterAligned>
      <MarginItem>
        {api.userProfile?.eventStatus.active && <Text style={{ color: 'white', fontSize: 20 }}>Cambia tu evento.</Text>}
        {!api.userProfile?.eventStatus.active && <Text style={{ color: 'white', fontSize: 20 }}>Reigstrate en un evento.</Text>}
      </MarginItem>

      <View style={{ width: '80%' }}>
        <MarginItem>
          <Picker selectedValue={selectedLocation}
            onValueChange={(itemValue, _) => {
              setIsDirty(true);
              setSelectedLocation(itemValue);
            }}
            style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
          >
            {api.locations!.map(location => (
              <Picker.Item key={location.id} label={location.name} value={location.id} />
            ))}
          </Picker>
        </MarginItem>

        <MarginItem>
          <BtnPrimary title={api.userProfile?.eventStatus.active ? date.toLocaleString('es-ES') : "Escoge una fecha"} onClick={() => setShowDatePicker(true)} />

          {showDatePicker && (
            <DateTimePicker
              minimumDate={new Date()}
              value={date}
              mode={Platform.OS == 'ios' ? "datetime" : "date"}
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setIsDirty(true);
                  setDate(selectedDate);
                  if (Platform.OS != 'ios') {
                    setShowTimePicker(true);
                  }
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={(_, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  setIsDirty(true);
                  setDate(selectedDate);
                }
              }}
            />
          )}
        </MarginItem>

        <BiggerMarginItem>
          {error && <ErrorText>{error}</ErrorText>}

          {api.userProfile?.eventStatus.active && <BtnPrimary title="Actualizar" onClick={onSubmit} disabled={!isDirty} />}
          {!api.userProfile?.eventStatus.active && <BtnPrimary title="Registrarte" onClick={onSubmit} disabled={!isDirty} />}

          {
            api.userProfile?.eventStatus.active &&
            <BtnSecondary title="Cancelar Evento" onClick={onCancel} />
          }
        </BiggerMarginItem>

      </View>
    </CenterAligned>
  );
}