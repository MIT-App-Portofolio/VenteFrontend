import React, { useState } from "react";
import { Text, View, Platform, Modal, TouchableOpacity, TextInput, FlatList, ListRenderItem, ScrollView } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import { useApi } from "@/api";
import { CenterAligned, BtnPrimary, ErrorText, BtnSecondary, FullScreenLoading, MarginItem, BiggerMarginItem } from "@/components/ThemedComponents";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function Calendar() {
  const api = useApi();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<number>(api.userProfile?.eventStatus.location?.id ?? 0);
  const [date, setDate] = useState(api.userProfile?.eventStatus.time ?? new Date());
  const [isDirty, setIsDirty] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

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

  const inviteUser = async () => {
    setLoading(true);
    const success = await api.inviteUser(inviteUsername);
    if (success) {
      setInviteUsername('');
    } else {
      setError("No se pudo invitar al usuario.");
      setIsModalVisible(false);
    }
    setLoading(false);
  };

  const kickUser = async (username: string) => {
    setLoading(true);
    const success = await api.kickUser(username);
    if (!success) {
      setError("No se pudo expulsar al usuario.");
    }
    setLoading(false);
  };

  const renderInvited = ({ item }: { item: string }) => {
    return (
      <View style={{
        margin: 5,

        paddingLeft: 5,
        paddingRight: 5,
        paddingBottom: 2,
        paddingTop: 2,

        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        borderRadius: 25,
        borderColor: 'white',
        borderWidth: 1
      }}>
        <Text style={{ color: 'white' }}>@{item}</Text>

        <TouchableOpacity onPress={() => kickUser(item)}>
          <IconSymbol name="cross" color='white' size={15} />
        </TouchableOpacity>
      </View>
    );
  }

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

        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}>
            <View style={{
              backgroundColor: 'black',
              padding: 20,
              borderRadius: 10,
              width: '80%',
            }}>
              <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>Invitados</Text>

              <FlatList
                data={api.userProfile?.eventStatus.with}
                renderItem={renderInvited}
                horizontal
                style={{ marginBottom: 10 }}
                keyExtractor={(item, index) => index.toString()}
              />

              <TextInput
                value={inviteUsername}
                onChangeText={setInviteUsername}
                placeholder="Nombre de usuario"
                placeholderTextColor="gray"
                style={{
                  padding: 10,
                  borderColor: 'white',
                  color: 'white',
                  fontSize: 15,
                  borderWidth: 1,
                  borderRadius: 4,
                  marginBottom: 10,
                }}
              />
              <BtnPrimary title="Invitar" onClick={inviteUser} disabled={inviteUsername ? false : true} />
              <BtnSecondary title="Cancelar" onClick={() => setIsModalVisible(false)} />
            </View>
          </View>
        </Modal>

        {
          api.userProfile?.eventStatus.active &&
          <MarginItem>
            <BtnPrimary title="Invitar Usuarios" onClick={() => setIsModalVisible(true)} />
          </MarginItem>
        }

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