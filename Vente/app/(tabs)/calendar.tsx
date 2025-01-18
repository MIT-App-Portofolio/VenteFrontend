import React, { useState } from "react";
import { View, Modal, TouchableOpacity, TextInput, FlatList } from "react-native";
import { useApi } from "@/api";
import { MarginItem, BiggerMarginItem } from '@/components/MarginItem';
import { ErrorText, ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { CenterAligned } from '@/components/CenterAligned';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { IconSymbol } from "@/components/ui/IconSymbol";
import { StyledDateTimePicker } from "@/components/StyledDatePicker";
import { StyledLocationPicker } from "@/components/StyledLocationPicker";

export default function Calendar() {
  const { api, userProfile } = useApi();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<number | null>(userProfile?.eventStatus.location?.id ?? null);
  const [date, setDate] = useState<Date | null>(userProfile?.eventStatus.time ?? null);
  const [isDirty, setIsDirty] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  const onSubmit = async () => {
    setLoading(true);
    if (selectedLocation == null) {
      setError("Escoge un lugar.");
      setLoading(false);
      return;
    }

    if (date == null) {
      setError("Escoge una fecha.");
      setLoading(false);
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
      setIsDirty(false);
      setSelectedLocation(null);
      setDate(null);
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
    if (success) {
      setError(null);
    } else {
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
        <ThemedText>@{item}</ThemedText>

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
        {userProfile?.eventStatus.active && <ThemedText type="title">Cambia tu evento.</ThemedText>}
        {!userProfile?.eventStatus.active && <ThemedText type="title">Registrate en un evento.</ThemedText>}
      </MarginItem>

      <View style={{ width: '80%' }}>
        <StyledLocationPicker locations={api.locations!} location={selectedLocation} setLocation={setSelectedLocation} setIsDirty={setIsDirty} />

        <StyledDateTimePicker title="Escoge una fecha" date={date} setIsDirty={setIsDirty} setDate={setDate} />

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
              <ThemedText type="subtitle">Invitados</ThemedText>

              <FlatList
                data={userProfile?.eventStatus.with}
                renderItem={renderInvited}
                horizontal
                style={{ marginBottom: 10 }}
                keyExtractor={(_, index) => index.toString()}
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
          userProfile?.eventStatus.active &&
          <MarginItem>
            <BtnPrimary title="Invitar Usuarios" onClick={() => setIsModalVisible(true)} />
          </MarginItem>
        }

        <BiggerMarginItem>
          {error && <ErrorText>{error}</ErrorText>}

          {userProfile?.eventStatus.active && <BtnPrimary title="Actualizar" onClick={onSubmit} disabled={!isDirty} />}
          {!userProfile?.eventStatus.active && <BtnPrimary title="Registrarte" onClick={onSubmit} disabled={!isDirty} />}

          {
            userProfile?.eventStatus.active &&
            <BtnSecondary title="Cancelar Evento" onClick={onCancel} />
          }
        </BiggerMarginItem>

      </View>
    </CenterAligned>
  );
}