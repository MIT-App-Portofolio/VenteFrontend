import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Animated, RefreshControl } from 'react-native';
import { MarginItem } from '@/components/MarginItem';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { CenterAligned } from '@/components/CenterAligned';
import { useApi } from '@/api';
import { Redirect, useRootNavigationState, useRouter } from 'expo-router';
import { Profile } from '@/api';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { StyledGenderFilter } from '@/components/GenderPicker';
import { StyledModal } from '@/components/StyledModal';
import { redirectStore } from '@/redirect_storage';
import FastImage from 'react-native-fast-image';
import { dateShortDisplay } from '@/dateDisplay';

export const pfpSize = 250;

export default function Users() {
  const router = useRouter();

  const { api, userProfile } = useApi();

  // State management
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<number | null>(null);
  const [ageRangeMax, setAgeRangeMax] = useState<number | null>(null);

  const isFetching = useRef(false);

  // Fetch visitors with proper error handling and loading states
  const fetchVisitors = useCallback(async (pageNum: number, shouldReset: boolean = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const newVisitors = await api.queryVisitors(pageNum, genderFilter, ageRangeMin, ageRangeMax);

      if (!newVisitors || newVisitors.length === 0) {
        setLastUserFetchEmpty(true);
      } else {
        // Fetch profile pictures for all new visitors
        await Promise.all(newVisitors.map(visitor => api.fetchPfp(visitor)));

        // Fetch profile pictures for users they go with
        await Promise.all(newVisitors.map(async visitor => {
          const profile = api.getUserUnstable(visitor);
          if (profile?.eventStatus?.with) {
            await Promise.all(profile.eventStatus.with.map(async withUser => {
              if (!api.hasUser(withUser)) {
                await api.getUser(withUser);
                await api.fetchPfp(withUser);
              }
            }));
          }
        }));

        setVisitors(prev => shouldReset ? newVisitors : [...prev, ...newVisitors]);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setLastUserFetchEmpty(true);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [api, genderFilter, ageRangeMin, ageRangeMax]);

  const initialFetch = useCallback(() => {
    setPage(0);
    setLastUserFetchEmpty(false);
    fetchVisitors(0, true);
  }, [fetchVisitors]);

  // Initial fetch and fetch on event status change
  useEffect(() => {
    initialFetch();
  }, [userProfile?.eventStatus]);

  const pageChangeFetch = useCallback(() => {
    if (page > 0) {
      fetchVisitors(page);
    }
  }, [page]);

  // Fetch more on page change
  useEffect(() => {
    pageChangeFetch();
  }, [page]);

  // Pull to refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLastUserFetchEmpty(false);
    setPage(0);
    await fetchVisitors(0, true);
    setRefreshing(false);
  }, [fetchVisitors]);

  // Apply filters
  const applyFilter = useCallback(async () => {
    setPage(0);
    setLastUserFetchEmpty(false);
    await fetchVisitors(0, true);
    setIsFilterModalVisible(false);
  }, [fetchVisitors]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom && !loading && !lastUserFetchEmpty) {
      setPage(page + 1);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsUserModalVisible(true);
  };

  const pendingRedirect = redirectStore.getPendingRedirect();
  const rootNavigationState = useRootNavigationState();
  if (pendingRedirect) {
    if (!rootNavigationState?.key) {
      return null;
    }

    return <Redirect href={pendingRedirect} />
  }

  if (!userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <ThemedText>No estas registrado en ningún evento.</ThemedText>
        <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
      </CenterAligned>
    );
  }

  const renderVisitor = ({ item }: { item: string }) => {
    var visitor = api.getUserUnstable(item);
    var pfpUrl = api.getPfpUnstable(item);

    if (visitor == null) {
      return null;
    }

    const displayName = visitor.name || `@${visitor.userName}`;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleProfileClick(visitor!)}>
        <View style={{ position: 'relative' }}>
          <FastImage source={{ uri: pfpUrl }} style={styles.profilePicture} />
          {visitor.note && (
            <View style={{
              position: 'absolute',
              top: -10,
              right: -10,
              backgroundColor: '#2A2A2A',
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#3A3A3A',
            }}>
              <ThemedText style={{ fontSize: 14, maxWidth: 140 }}>
                {visitor.note}
              </ThemedText>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
          <ThemedText type="subtitle" style={{ marginTop: 5, maxWidth: pfpSize * 0.9 }} ellipsizeMode='tail' numberOfLines={2}>{displayName}</ThemedText>
          <View style={{
            flexDirection: 'row',
            gap: 2,
            alignItems: 'center',
          }}>
            <Feather name='calendar' size={16} color='white' />
            <ThemedText>{dateShortDisplay(new Date(visitor.eventStatus.time!))}</ThemedText>
          </View>

          <View style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center'
          }}>
            {visitor.years &&
              <ThemedText>{visitor.years} años</ThemedText>
            }

            {
              visitor.igHandle && (
                <View style={styles.igContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <ThemedText type='link' style={{ marginLeft: 2 }} ellipsizeMode='tail' numberOfLines={1}>{visitor.igHandle}</ThemedText>
                </View>
              )
            }
          </View>
        </View >
      </TouchableOpacity >
    );
  };

  const flagPress = () => {
    setUserFlagMessage(null);
    setUserFlagVisible(true);
  };

  return (
    <HorizontallyAligned>
      <View style={{ marginBottom: 10, width: 150 }}>
        <BtnPrimary title='Volver' onClick={() => router.push("/")}></BtnPrimary>
      </View>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <ThemedText type='title' style={{ alignSelf: 'flex-start', marginTop: 10 }}>Usuarios que también van a {api.getOwnLocationName(userProfile)}</ThemedText>

        <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, marginBottom: 10 }}>
          <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
        </View>

        <CenterAligned>
          {visitors.map((value, _1, _2) => (
            <React.Fragment key={value}>
              {renderVisitor({ item: value })}
            </React.Fragment>
          ))}

          {loading && <ThemedText>Cargando mas...</ThemedText>}
        </CenterAligned>
      </Animated.ScrollView>

      {/* Filter modal */}
      <StyledModal isModalVisible={isFilterModalVisible} setIsModalVisible={setIsFilterModalVisible} includeButton={false}>
        <ThemedText type="title">Filtrar</ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20 }}>Genero</ThemedText>
        <StyledGenderFilter gender={genderFilter} setGender={setGenderFilter} />

        <ThemedText type="subtitle" style={{ marginTop: 20 }}>Rango de edad</ThemedText>
        <View style={styles.modalRow}>
          <TextInput
            placeholder="Min"
            keyboardType="numeric"
            placeholderTextColor='gray'
            value={ageRangeMin?.toString() || ''}
            onChangeText={(text) => setAgeRangeMin(text ? parseInt(text) : null)}
            style={styles.modalInput}
          />
          <ThemedText style={{ color: 'white', fontSize: 25 }}>-</ThemedText>
          <TextInput
            placeholder="Max"
            keyboardType="numeric"
            placeholderTextColor='gray'
            value={ageRangeMax?.toString() || ''}
            onChangeText={(text) => setAgeRangeMax(text ? parseInt(text) : null)}
            style={styles.modalInput}
          />
        </View>

        <MarginItem>
          <BtnPrimary title="Aplicar filtro" onClick={applyFilter} />
        </MarginItem>
        <MarginItem>
          <BtnSecondary title="Cerrar" onClick={() => setIsFilterModalVisible(false)} />
        </MarginItem>
      </StyledModal>

      {/* Profile modal */}
      {
        selectedProfile &&
        (
          <StyledModal isModalVisible={isUserModalVisible} setIsModalVisible={setIsUserModalVisible} includeButton={!userFlagVisible} topRightElement={(userFlagVisible || selectedProfile.userName == userProfile.userName) ? undefined : {
            icon: "flag",
            onPress: flagPress,
          }}>
            {
              userFlagVisible ? (
                <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
                  {
                    userFlagMessage ? (
                      <ThemedText>{userFlagMessage}</ThemedText>
                    ) : (
                      <View style={{ flexDirection: 'column', gap: 5 }}>
                        <BtnPrimary title='Reportar usuario' disabled={userFlagLoading} onClick={
                          async () => {
                            setUserFlagLoading(true);
                            const success = await api.report(selectedProfile.userName);
                            if (success) {
                              setUserFlagMessage('Usuario reportado');
                            } else {
                              setUserFlagMessage('Algo fue mal...');
                            }
                            setUserFlagLoading(false);
                          }} />
                        <BtnPrimary title='Bloquear usuario' disabled={userFlagLoading} onClick={async () => {
                          setUserFlagLoading(true);
                          const success = await api.block(selectedProfile.userName);
                          if (success) {
                            setUserFlagMessage('Usuario bloqueado. Refresque la pagina de usuarios.');
                          } else {
                            setUserFlagMessage('Algo fue mal...');
                          }
                          setUserFlagLoading(false);
                        }} />
                      </View>
                    )
                  }
                  <BtnSecondary title={userFlagMessage ? "Cerrar" : "Cancelar"} onClick={() => setUserFlagVisible(false)} />
                </View>
              ) : (
                <ScrollView style={styles.modalContent}>
                  <View style={{ position: 'relative' }}>
                    <FastImage source={{ uri: api.getPfpUnstable(selectedProfile.userName) }} style={styles.modalProfilePicture} />
                    {selectedProfile.note && (
                      <View style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        backgroundColor: '#2A2A2A',
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#3A3A3A',
                      }}>
                        <ThemedText style={{ fontSize: 14, maxWidth: 140 }}>
                          {selectedProfile.note}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                    {
                      selectedProfile.name &&
                      <ThemedText style={{ marginRight: 10 }} type="title">{selectedProfile.name}</ThemedText>
                    }

                    <ThemedText style={{ color: 'gray' }}>@{selectedProfile.userName}</ThemedText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    {selectedProfile.years &&
                      <ThemedText style={{ marginTop: 10 }}>{selectedProfile.years} años</ThemedText>
                    }

                    <View style={{
                      flexDirection: 'row',
                      gap: 2,
                      alignItems: 'center',
                    }}>
                      <Feather name='calendar' size={16} color='white' />
                      <ThemedText>{dateShortDisplay(new Date(selectedProfile.eventStatus.time!))}</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={{ marginTop: 5 }}>{selectedProfile.description}</ThemedText>

                  {selectedProfile.igHandle && (
                    <View style={styles.modalIgContainer}>
                      <FontAwesome name="instagram" size={16} color="white" />
                      <ThemedText type="link" style={{ marginLeft: 3 }} onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)} numberOfLines={1} ellipsizeMode='tail'>
                        {selectedProfile.igHandle}
                      </ThemedText>
                    </View>
                  )}

                  {selectedProfile.eventStatus.with && selectedProfile.eventStatus.with.length > 0 && (
                    <ThemedText style={{ marginTop: 10 }}>Va con:</ThemedText>
                  )}

                  {/* Render profiles of users that go with the selected profile */}
                  <View style={styles.invitedUsersContainer}>
                    {selectedProfile.eventStatus.with?.map((username) => {
                      const user = api.getUserUnstable(username);

                      if (!user) return null;

                      return (
                        <View key={username} style={styles.invitedUserCard}>
                          <FastImage source={{ uri: api.getPfpUnstable(username) }} style={styles.invitedUserProfilePicture} />
                          <ThemedText>{user.name || `@${user.userName}`}</ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )
            }
          </StyledModal>
        )
      }
    </HorizontallyAligned>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: 'black',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
  },
  profilePicture: {
    width: pfpSize,
    height: pfpSize,
    borderRadius: 10,
  },
  igContainer: {
    maxWidth: pfpSize * 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRange: {
    color: 'white',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: 'black',
    padding: 20,
    marginTop: 80,
    borderRadius: 10,
    width: '100%',
    height: '100%',
  },
  modalProfilePicture: {
    width: '100%',
    borderRadius: 15,
    height: undefined,
    aspectRatio: 1,
  },
  modalIgContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
  },
  invitedUsersContainer: {
    marginTop: 20,
  },
  invitedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  invitedUserProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  modalPicker: {
    color: 'white',
    marginBottom: 20,
    backgroundColor: 'black',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInput: {
    padding: 10,
    borderColor: 'white',
    color: 'white',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 4,
    width: '45%',
  },
  toggleButton: {
    backgroundColor: 'black',
    borderRadius: 15,
    width: '100%',
    height: 200,
  },
  toggleButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    opacity: 0.4,
  },
  toggleButtonText: {
    color: 'white',
    position: 'absolute',
    bottom: 10,
    left: 10,
    textTransform: 'uppercase',
  },
  visitorsContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  flatListContent: {
    paddingBottom: 250,
  },
  loadingText: {
    color: 'white',
  },
});
