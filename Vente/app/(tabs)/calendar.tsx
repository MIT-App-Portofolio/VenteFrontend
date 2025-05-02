import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Image, Platform } from "react-native";
import { Exit, useApi } from "@/api";
import { MarginItem } from '@/components/MarginItem';
import { ErrorText, ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { IconSymbol } from "@/components/ui/IconSymbol";
import { StyledDatePicker, StyledMultipleDatesPicker } from "@/components/StyledDatePicker";
import { StyledLocationPicker } from "@/components/StyledLocationPicker";
import { StyledTextInput } from "@/components/StyledInput";
import { StyledModal } from "@/components/StyledModal";
import { dateShortDisplay, dateListDisplay } from "@/dateDisplay";
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Toast from 'react-native-toast-message';
import FastImage from 'react-native-fast-image';

type CreateExitStep = 'name' | 'date' | 'location' | 'review';

export default function Calendar() {
  const { api, userProfile, exits, invitedExits } = useApi();
  const [loading, setLoading] = useState(false);
  const [selectedExit, setSelectedExit] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [exitName, setExitName] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const [singleDate, setSingleDate] = useState<Date | null>(null);
  const [multipleDates, setMultipleDates] = useState<Date[] | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [useMultipleDates, setUseMultipleDates] = useState(false);

  const [acceptingInvites, setAcceptingInvites] = useState<{ [key: number]: boolean }>({});
  const [decliningInvites, setDecliningInvites] = useState<{ [key: number]: boolean }>({});

  const [currentStep, setCurrentStep] = useState<CreateExitStep>('name');

  const [selectedInvitedExit, setSelectedInvitedExit] = useState<number | null>(null);
  const [isInvitationModalVisible, setIsInvitationModalVisible] = useState(false);

  // Fetch profile pictures for all members and pending invites
  useEffect(() => {
    const fetchPfps = async () => {
      if (exits) {
        for (const exit of exits) {
          await api.fetchPfp(exit.leader);
          for (const member of exit.members || []) {
            await api.fetchPfp(member);
          }
          for (const invite of exit.awaitingInvite || []) {
            await api.fetchPfp(invite);
          }
        }
      }

      if (invitedExits) {
        for (const exit of invitedExits) {
          await api.fetchPfp(exit.leader);
          for (const member of exit.members || []) {
            await api.fetchPfp(member);
          }
        }
      }
    };

    fetchPfps();
  }, [exits, invitedExits]);

  // Refresh exits on mount
  useEffect(() => {
    const refreshExits = async () => {
      await api.getExits();
      await api.getInvitationExits();
    };
    refreshExits();
  }, []);

  const createExit = async () => {
    if (((useMultipleDates && !multipleDates) || (!useMultipleDates && !singleDate)) || !selectedLocation) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Por favor, selecciona una fecha y un lugar'
      });
      return;
    }

    setLoading(true);
    const location = api.locations?.find(loc => loc.id === selectedLocation);
    if (!location) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error al seleccionar el lugar'
      });
      setLoading(false);
      return;
    }

    const [success, errorMessage] = await api.registerExit(
      exitName || null,
      location,
      useMultipleDates ? multipleDates! : [singleDate!]
    );

    if (!success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: typeof errorMessage === 'string' ? errorMessage : "Error al crear la escapada"
      });
    } else {
      setExitName('');
      setSingleDate(null);
      setMultipleDates(null);
      setSelectedLocation(null);
      setIsDirty(false);
      setIsCreateModalVisible(false);
    }
    setLoading(false);
  };

  const inviteUser = async () => {
    if (!selectedExit) return;

    setLoading(true);
    const [success, errorMessage] = await api.inviteUser(selectedExit, inviteUsername);
    if (success) {
      setShowInviteForm(false);
      setInviteUsername('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage || "No se pudo invitar al usuario."
      });
    }
    setLoading(false);
  };

  const kickUser = async (exitId: number, username: string) => {
    setLoading(true);
    const success = await api.kickUser(exitId, username);
    if (!success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: "No se pudo expulsar al usuario."
      });
    }
    setLoading(false);
  };

  const handleAcceptInvite = async (exitId: number) => {
    setAcceptingInvites(prev => ({ ...prev, [exitId]: true }));
    const [success, errorMessage] = await api.acceptInvite(exitId);
    if (!success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage || "No se pudo aceptar la invitación."
      });
    }
    setIsInvitationModalVisible(false);
    setAcceptingInvites(prev => ({ ...prev, [exitId]: false }));
  };

  const handleDeclineInvite = async (exitId: number) => {
    setDecliningInvites(prev => ({ ...prev, [exitId]: true }));
    const success = await api.declineInvite(exitId);
    if (!success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: "No se pudo rechazar la invitación."
      });
    }
    setIsInvitationModalVisible(false);
    setDecliningInvites(prev => ({ ...prev, [exitId]: false }));
  };

  const renderExitCard = ({ item }: { item: Exit }) => {
    const location = api.locations?.find(loc => loc.id === item.locationId);
    const isLeader = item.leader === userProfile?.userName;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedExit(item.id);
          setIsModalVisible(true);
        }}
        style={{
          margin: 10,
          borderRadius: 15,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'white',
          width: 200,
        }}
      >
        <Image
          source={{ uri: location?.pictureUrl }}
          style={{ width: '100%', height: 150, opacity: 0.8 }}
        />
        <View style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <ThemedText type="subtitle">{item.name || location?.name}</ThemedText>
          <ThemedText>{item.dates.length === 1 ? dateShortDisplay(item.dates[0]) : item.dates.length + " fechas"}</ThemedText>
          {isLeader && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <IconSymbol name="crown" color="gold" size={15} />
              <ThemedText style={{ marginLeft: 5 }}>Eres el líder</ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderInvitedExitCard = ({ item }: { item: any }) => {
    const location = api.locations?.find(loc => loc.id === item.locationId);
    const isAccepting = acceptingInvites[item.id] || false;
    const isDeclining = decliningInvites[item.id] || false;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedInvitedExit(item.id);
          setIsInvitationModalVisible(true);
        }}
        style={{
          margin: 10,
          borderRadius: 15,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'white',
          width: 200,
        }}
      >
        <Image
          source={{ uri: location?.pictureUrl }}
          style={{ height: 150, opacity: 0.8 }}
        />
        <View style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <ThemedText type="subtitle">{item.name || location?.name}</ThemedText>
          <ThemedText>{item.dates.length === 1 ? dateShortDisplay(item.dates[0]) : item.dates.length + " fechas"}</ThemedText>
          <ThemedText style={{ fontSize: 12, marginTop: 5 }}>Invitado por: @{item.leader}</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isAccepting && styles.loadingButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptInvite(item.id);
              }}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="check" size={20} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isDeclining && styles.loadingButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleDeclineInvite(item.id);
              }}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="x" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateExitStep = () => {
    const steps: CreateExitStep[] = ['name', 'date', 'location', 'review'];

    return (
      <View>
        <View style={styles.stepIndicatorContainer}>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepIndicatorWrapper}>
              <View
                style={[
                  styles.stepIndicator,
                  currentStep === step && styles.stepIndicatorActive
                ]}
              />
              {index < steps.length - 1 && <View style={styles.stepIndicatorLine} />}
            </View>
          ))}
        </View>

        {(() => {
          switch (currentStep) {
            case 'name':
              return (
                <View>
                  <ThemedText type="title">Dale un nombre a tu escapada</ThemedText>
                  <StyledTextInput
                    value={exitName}
                    setValue={setExitName}
                    placeholder="Nombre de la escapada (opcional)"
                    maxLength={20}
                  />
                </View>
              );
            case 'date':
              return (
                <View>
                  <ThemedText type="title">¿Cuando vas?</ThemedText>

                  <View style={{ marginBottom: 20 }}>
                    <SegmentedControl
                      values={['Fecha única', 'Varias fechas']}
                      selectedIndex={useMultipleDates ? 1 : 0}
                      appearance="dark"
                      onChange={(event) => {
                        setUseMultipleDates(event.nativeEvent.selectedSegmentIndex === 1);
                        setIsDirty(true);
                      }}
                      style={{ marginTop: 10 }}
                    />
                  </View>

                  {useMultipleDates ?
                    <StyledMultipleDatesPicker
                      dates={multipleDates}
                      setDates={setMultipleDates}
                      setIsDirty={setIsDirty}
                      futureOnly={true}
                      title="Escoge"
                    />
                    :
                    <StyledDatePicker
                      date={singleDate}
                      setDate={setSingleDate}
                      setIsDirty={setIsDirty}
                      title="Escoge"
                      futureOnly={true}
                    />
                  }
                </View>
              );
            case 'location':
              return (
                <View>
                  <ThemedText type="title">¿A donde quieres ir?</ThemedText>
                  <StyledLocationPicker
                    locations={api.locations || []}
                    location={selectedLocation}
                    setLocation={(location: string) => setSelectedLocation(location)}
                    setIsDirty={(dirty: boolean) => setIsDirty(dirty)}
                  />
                </View>
              );
            case 'review':
              return (
                <View>
                  <ThemedText type="title">¿Todo correcto?</ThemedText>
                  <View style={[styles.reviewContainer, { backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 10, padding: 15 }]}>
                    <ThemedText type="subtitle">Nombre:</ThemedText>
                    <ThemedText>{exitName || 'Sin nombre'}</ThemedText>

                    <ThemedText type="subtitle" style={{ marginTop: 10 }}>Fecha:</ThemedText>
                    <ThemedText>{useMultipleDates ? (multipleDates ? multipleDates.length + " fechas" : "No seleccionado") : (singleDate ? dateShortDisplay(singleDate) : "No seleccionada")}</ThemedText>

                    <ThemedText type="subtitle" style={{ marginTop: 10 }}>Lugar:</ThemedText>
                    <ThemedText>{selectedLocation ? api.locations?.find(loc => loc.id === selectedLocation)?.name : 'No seleccionado'}</ThemedText>
                  </View>
                </View>
              );
          }
        })()}
      </View>
    );
  };

  const renderNavigationButtons = () => {
    switch (currentStep) {
      case 'name':
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BtnSecondary title="Cancelar" onClick={() => {
              setIsCreateModalVisible(false);
              resetCreateExitForm();
            }} style={{ flex: 1 }} />
            <BtnPrimary title="Siguiente" onClick={() => setCurrentStep('date')} style={{ flex: 3 }} />
          </View>
        );
      case 'date':
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BtnSecondary title="Atrás" onClick={() => setCurrentStep('name')} style={{ flex: 1 }} />
            <BtnPrimary title="Siguiente" onClick={() => setCurrentStep('location')} style={{ flex: 3 }} disabled={useMultipleDates ? !multipleDates : !singleDate} />
          </View>
        );
      case 'location':
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BtnSecondary title="Atrás" onClick={() => setCurrentStep('date')} style={{ flex: 1 }} />
            <BtnPrimary title="Siguiente" onClick={() => setCurrentStep('review')} style={{ flex: 3 }} disabled={!selectedLocation} />
          </View>
        );
      case 'review':
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BtnSecondary title="Atrás" onClick={() => setCurrentStep('location')} style={{ flex: 1 }} />
            <BtnPrimary
              title="Crear"
              onClick={createExit}
              disabled={(useMultipleDates ? !multipleDates : !singleDate) || !selectedLocation || loading || !isDirty}
              style={{ flex: 3 }}
            />
          </View>
        );
    }
  };

  const resetCreateExitForm = () => {
    setExitName('');
    setSingleDate(null);
    setMultipleDates(null);
    setSelectedLocation(null);
    setIsDirty(false);
    setUseMultipleDates(false);
    setCurrentStep('name');
  };

  if (loading) {
    return <FullScreenLoading />;
  }

  return (
    <SafeAreaView style={{ flex: 1, margin: 20, justifyContent: 'space-between', paddingBottom: Platform.OS === 'android' ? 0 : 100 }} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'space-between' }} horizontal={false}>
        {invitedExits && invitedExits.length > 0 && (
          <View style={{ width: '100%' }}>
            <MarginItem>
              <ThemedText type="title">Invitaciones</ThemedText>
            </MarginItem>
            <FlatList
              data={invitedExits}
              renderItem={renderInvitedExitCard}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <MarginItem>
          <ThemedText type="title">Tus escapadas</ThemedText>
        </MarginItem>

        {exits && exits.length > 0 ? (
          <FlatList
            data={exits}
            renderItem={renderExitCard}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <MarginItem>
            <ThemedText>No tienes ninguna escapada programada</ThemedText>
          </MarginItem>
        )}

        <StyledModal
          isModalVisible={isModalVisible}
          setIsModalVisible={(visible) => {
            setIsModalVisible(visible);
            setShowInviteForm(false);
          }}
          includeButton={true}
        >
          {selectedExit && exits && (() => {
            const exit = exits.find(e => e.id === selectedExit);
            const location = api.locations?.find(loc => loc.id === exit?.locationId);
            const displayMembers = exit?.leader == userProfile?.userName ? exit?.members! : [...(exit?.members?.filter(member => member !== userProfile?.userName) || []), exit?.leader!];

            if (showInviteForm) {
              return (
                <View>
                  <Toast />
                  <StyledTextInput
                    value={inviteUsername}
                    setValue={setInviteUsername}
                    placeholder="Nombre de usuario"
                    autoCapitalize="none"
                  />
                  <BtnPrimary title="Invitar" onClick={inviteUser} disabled={!inviteUsername} style={{ marginTop: 10, marginBottom: 2 }} />
                  <BtnSecondary title="Cancelar" onClick={() => setShowInviteForm(false)} />
                </View>
              );
            }

            return (
              <View>
                <ThemedText type="title">{exit?.name || location?.name}</ThemedText>

                <View style={[styles.reviewContainer, {
                  backgroundColor: '#2A2A2A',
                  borderWidth: 1,
                  borderColor: '#3A3A3A',
                  borderRadius: 10,
                  padding: 15,
                  marginTop: 10
                }]}>
                  <ThemedText type="subtitle">Fechas:</ThemedText>
                  <ThemedText style={{ marginLeft: 10 }}>
                    {dateListDisplay(exit?.dates || [])}
                  </ThemedText>

                  <ThemedText type="subtitle" style={{ marginTop: 10 }}>Lugar:</ThemedText>
                  <ThemedText style={{ marginLeft: 10 }}>{location?.name}</ThemedText>
                </View>

                {displayMembers.length > 0 &&
                  <>
                    <ThemedText type="subtitle" style={{ marginTop: 20 }}>Invitados</ThemedText>
                    <FlatList
                      data={displayMembers}
                      renderItem={({ item }) => (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#2A2A2A',
                          padding: 12,
                          borderRadius: 12,
                          marginVertical: 4,
                          borderWidth: 1,
                          borderColor: '#3A3A3A',
                        }}>
                          <FastImage
                            source={{ uri: api.getPfpFromCache(item) }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              marginRight: 12,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontSize: 16 }}>@{item}</ThemedText>
                          </View>
                          {exit?.leader === userProfile?.userName && (
                            <TouchableOpacity
                              onPress={() => kickUser(selectedExit, item)}
                              style={{
                                padding: 8,
                                borderRadius: 8,
                                backgroundColor: '#3A3A3A',
                              }}
                            >
                              <IconSymbol name='xmark' color='white' size={16} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      style={{ marginBottom: 10 }}
                      keyExtractor={(_, index) => index.toString()}
                    />
                  </>
                }

                {exit?.awaitingInvite?.length! > 0 &&
                  <>
                    <ThemedText type="subtitle" style={{ marginTop: 20 }}>Invitaciones pendientes</ThemedText>
                    <FlatList
                      data={exit?.awaitingInvite || []}
                      renderItem={({ item }) => (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#2A2A2A',
                          padding: 12,
                          borderRadius: 12,
                          marginVertical: 4,
                          borderWidth: 1,
                          borderColor: '#3A3A3A',
                        }}>
                          <FastImage
                            source={{ uri: api.getPfpFromCache(item) }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              marginRight: 12,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontSize: 16 }}>@{item}</ThemedText>
                          </View>
                          <TouchableOpacity
                            onPress={() => kickUser(selectedExit, item)}
                            style={{
                              padding: 8,
                              borderRadius: 8,
                              backgroundColor: '#3A3A3A',
                            }}
                          >
                            <IconSymbol name='xmark' color='white' size={16} />
                          </TouchableOpacity>
                        </View>
                      )}
                      style={{ marginBottom: 10 }}
                      keyExtractor={(_, index) => index.toString()}
                    />
                  </>
                }

                <View style={{ flexDirection: 'column', gap: 5, marginTop: 20 }}>
                  {
                    exit?.leader === userProfile?.userName && (
                      <BtnPrimary
                        title={"Invitar a alguien"}
                        onClick={() => setShowInviteForm(true)}
                      />
                    )
                  }

                  <BtnSecondary
                    title={exit?.leader === userProfile?.userName ? "Cancelar escapada" : "Salir de la escapada"}
                    onClick={async () => {
                      if (await api.cancelExit(selectedExit)) {
                        setIsModalVisible(false);
                      } else {
                        Toast.show({
                          type: 'error',
                          text1: 'Error',
                          text2: 'No se pudo cancelar la escapada'
                        });
                      }
                    }}
                  />
                </View>
              </View>
            );
          })()}
        </StyledModal>

        <StyledModal
          isModalVisible={isCreateModalVisible}
          setIsModalVisible={setIsCreateModalVisible}
          includeButton={true}
          fixedBottomContent={renderNavigationButtons()}
        >
          {renderCreateExitStep()}
          <Toast />
        </StyledModal>

        <StyledModal
          isModalVisible={isInvitationModalVisible}
          setIsModalVisible={(visible) => {
            setIsInvitationModalVisible(visible);
            setSelectedInvitedExit(null);
          }}
          includeButton={true}
        >
          {selectedInvitedExit && invitedExits && (() => {
            const exit = invitedExits.find(e => e.id === selectedInvitedExit);
            if (!exit) return null;

            const location = api.locations?.find(loc => loc.id === exit.locationId);
            const isAccepting = acceptingInvites[exit.id] || false;
            const isDeclining = decliningInvites[exit.id] || false;

            return (
              <View>
                <ThemedText type="title">{exit.name || location?.name}</ThemedText>

                <View style={[styles.reviewContainer, {
                  backgroundColor: '#2A2A2A',
                  borderWidth: 1,
                  borderColor: '#3A3A3A',
                  borderRadius: 10,
                  padding: 15,
                  marginTop: 10
                }]}>
                  <ThemedText type="subtitle">Fechas:</ThemedText>
                  <ThemedText style={{ marginLeft: 10 }}>
                    {dateListDisplay(exit.dates || [])}
                  </ThemedText>

                  <ThemedText type="subtitle" style={{ marginTop: 10 }}>Lugar:</ThemedText>
                  <ThemedText style={{ marginLeft: 10 }}>{location?.name}</ThemedText>

                  <ThemedText type="subtitle" style={{ marginTop: 10 }}>Invitado por:</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                    <FastImage
                      source={{ uri: api.getPfpFromCache(exit.leader) }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginRight: 10,
                      }}
                    />
                    <ThemedText>@{exit.leader}</ThemedText>
                  </View>

                  {exit.members?.length! > 0 && (
                    <>
                      <ThemedText type="subtitle" style={{ marginTop: 10 }}>Miembros:</ThemedText>
                      <FlatList
                        data={exit.members?.filter(member => member !== userProfile?.userName) || []}
                        renderItem={({ item }) => (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#2A2A2A',
                            padding: 12,
                            borderRadius: 12,
                            marginVertical: 4,
                            marginLeft: 10,
                            borderWidth: 1,
                            borderColor: '#3A3A3A',
                          }}>
                            <FastImage
                              source={{ uri: api.getPfpFromCache(item) }}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                marginRight: 12,
                              }}
                            />
                            <ThemedText style={{ fontSize: 16 }}>@{item}</ThemedText>
                          </View>
                        )}
                        style={{ marginBottom: 10 }}
                        keyExtractor={(_, index) => index.toString()}
                      />
                    </>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <BtnSecondary
                    title="Rechazar"
                    onClick={() => handleDeclineInvite(exit.id)}
                    disabled={isAccepting || isDeclining}
                    style={{ flex: 1 }}
                  />
                  <BtnPrimary
                    title="Aceptar"
                    onClick={() => handleAcceptInvite(exit.id)}
                    disabled={isAccepting || isDeclining}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            );
          })()}
        </StyledModal>
      </ScrollView>
      <View>
        <BtnPrimary title="Crear escapada" onClick={() => {
          setIsCreateModalVisible(true);
          setCurrentStep('name');
        }} />
      </View>
      <Toast />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingButton: {
    backgroundColor: '#3A3A3A',
  },
  reviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 2
  },
  stepIndicatorWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'gray',
    marginBottom: 5,
  },
  stepIndicatorActive: {
    backgroundColor: 'white',
  },
  stepIndicatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A3A3A',
  },
});