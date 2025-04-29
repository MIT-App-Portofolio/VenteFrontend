import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Animated, Image, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { MarginItem } from '@/components/MarginItem';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { CenterAligned } from '@/components/CenterAligned';
import { ExitUserQuery, useApi } from '@/api';
import { Redirect, useRootNavigationState, useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { StyledGenderFilter } from '@/components/GenderPicker';
import { StyledModal } from '@/components/StyledModal';
import { redirectStore } from '@/redirect_storage';
import FastImage from 'react-native-fast-image';
import { dateListDisplay, dateShortDisplay } from '@/dateDisplay';
import DropDownPicker from 'react-native-dropdown-picker';
import { Badge } from 'react-native-elements/dist/badge/Badge';

export const pfpSize = 250;

export default function Users() {
  const router = useRouter();

  const { api, exits, userProfile, messageSummaries } = useApi();

  // State management
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ExitUserQuery | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<number | null>(null);
  const [ageRangeMax, setAgeRangeMax] = useState<number | null>(null);
  const [likedUsers, setLikedUsers] = useState<Set<string>>(new Set());

  const [selectedExitId, setSelectedExitId] = useState<number | null>(null);

  const [exitPickerOpen, setExitPickerOpen] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const isFetching = useRef(false);

  const flatListRef = useRef<FlatList<string>>(null);

  // Set initial selected exit when exits are loaded
  useEffect(() => {
    if (exits?.length == 0) {
      setSelectedExitId(null);
    }
    if (exits && exits.length > 0 && !selectedExitId) {
      setSelectedExitId(exits[0].id);
    }
  }, [exits]);

  // Fetch visitors with proper error handling and loading states
  const fetchVisitors = useCallback(async (pageNum: number, shouldReset: boolean = false) => {
    if (isFetching.current || !selectedExitId) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const newVisitors = await api.queryVisitors(selectedExitId, pageNum, genderFilter, ageRangeMin, ageRangeMax);
      if (!newVisitors || newVisitors.length === 0) {
        setLastUserFetchEmpty(true);
      } else {
        // Fetch profile pictures for all new visitors
        await Promise.all(newVisitors.map(visitor => api.fetchPfp(visitor)));

        // Update likedUsers state with likes from new visitors
        setLikedUsers(prev => {
          const newSet = new Set(prev);
          newVisitors.forEach(visitor => {
            const user = api.getUserCached(visitor) as ExitUserQuery;
            if (user?.userLiked) {
              newSet.add(user.userName);
            }
          });
          return newSet;
        });

        setVisitors(prev => shouldReset ? newVisitors : [...prev, ...newVisitors]);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setLastUserFetchEmpty(true);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [api, selectedExitId, genderFilter, ageRangeMin, ageRangeMax]);

  const initialFetch = useCallback(() => {
    scrollToTop();
    setPage(0);
    setLastUserFetchEmpty(false);
    fetchVisitors(0, true);
  }, [fetchVisitors]);

  // Initial fetch and fetch on exit change
  useEffect(() => {
    if (selectedExitId) {
      setLikedUsers(new Set()); // Reset likes when exit changes
      initialFetch();
    }
  }, [selectedExitId]);

  // Reset on refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLastUserFetchEmpty(false);
    setPage(0);
    setLikedUsers(new Set()); // Reset likes on refresh
    await fetchVisitors(0, true);
    setRefreshing(false);
  }, [fetchVisitors]);

  // Reset on filter apply
  const applyFilter = useCallback(async () => {
    setPage(0);
    setLastUserFetchEmpty(false);
    setLikedUsers(new Set()); // Reset likes when filters change
    await fetchVisitors(0, true);
    setIsFilterModalVisible(false);
  }, [fetchVisitors]);

  // Reset on first load
  useEffect(() => {
    if (selectedExitId) {
      setLikedUsers(new Set()); // Reset likes on first load
      initialFetch();
    }
  }, [selectedExitId, initialFetch]);

  // Reset when gender filter changes
  useEffect(() => {
    if (selectedExitId) {
      setLikedUsers(new Set()); // Reset likes when gender filter changes
      initialFetch();
    }
  }, [genderFilter, selectedExitId, initialFetch]);

  // Reset when age range changes
  useEffect(() => {
    if (selectedExitId) {
      setLikedUsers(new Set()); // Reset likes when age range changes
      initialFetch();
    }
  }, [ageRangeMin, ageRangeMax, selectedExitId, initialFetch]);

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const pageChangeFetch = useCallback(() => {
    if (page > 0) {
      fetchVisitors(page);
    }
  }, [page]);

  // Fetch more on page change
  useEffect(() => {
    pageChangeFetch();
  }, [page]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleProfileClick = (profile: ExitUserQuery) => {
    setSelectedProfile(profile);
    setIsUserModalVisible(true);
  };

  const handleLoadMore = useCallback(() => {
    if (!loading && !lastUserFetchEmpty) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, lastUserFetchEmpty]);

  const handleLike = useCallback(async (username: string, exitId: number, isLiked: boolean) => {
    // Optimistically update UI
    setLikedUsers(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.add(username);
      } else {
        newSet.delete(username);
      }
      return newSet;
    });

    // Make API call in background
    try {
      if (isLiked) {
        await api.likeProfile(username, exitId);
      } else {
        await api.unlikeProfile(username, exitId);
      }
    } catch (error) {
      // Revert on error
      setLikedUsers(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(username);
        } else {
          newSet.add(username);
        }
        return newSet;
      });
    }
  }, [api, likedUsers]);

  const pendingRedirect = redirectStore.getPendingRedirect();
  const rootNavigationState = useRootNavigationState();
  if (pendingRedirect) {
    if (!rootNavigationState?.key) {
      return null;
    }

    return <Redirect href={pendingRedirect} />
  }

  // View event places button interpolation
  const buttonHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [160, 40],
    extrapolate: 'clamp',
  });

  if (!selectedExitId || exits?.length == 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ width: '100%', alignItems: 'flex-end', paddingHorizontal: 10 }}>
          <TouchableOpacity onPress={() => router.push("/messages")}>
            <View style={{ position: 'relative' }}>
              <Feather name='send' size={24} color='white' />
              {messageSummaries && messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length > 0 && (
                <Badge value={messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length} containerStyle={{ position: 'absolute', top: 5, left: 60 }} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <CenterAligned>
          <ThemedText>Aun no sabemos cuando sales</ThemedText>
          <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
        </CenterAligned>
      </SafeAreaView>
    );
  }

  const renderVisitor = ({ item }: { item: string }) => {
    var visitor = api.getUserCached(item) as ExitUserQuery;
    var pfpUrl = api.getPfpFromCache(item);

    if (visitor == null) {
      return null;
    }

    const displayName = visitor.name || `@${visitor.userName}`;
    const isLiked = likedUsers.has(visitor.userName);

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
          <TouchableOpacity
            style={[styles.likeButton, { position: 'absolute', bottom: 10, right: 10 }]}
            onPress={async (e) => {
              e.stopPropagation();
              handleLike(visitor.userName, visitor.exitId, !isLiked);
            }}
          >
            {isLiked ? (
              <FontAwesome name="heart" size={20} color="#FF4444" />
            ) : (
              <FontAwesome name="heart-o" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
          <ThemedText type="subtitle" style={{ marginTop: 5, maxWidth: pfpSize * 0.9 }} ellipsizeMode='tail' numberOfLines={2}>{displayName}</ThemedText>
          <View style={{
            flexDirection: 'row',
            gap: 2,
            alignItems: 'center',
          }}>
            <Feather name='calendar' size={16} color='white' />
            <ThemedText>{visitor.dates.length == 1 ? dateShortDisplay(visitor.dates[0]) : visitor.dates.length + " fechas"}</ThemedText>
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
        </View>
      </TouchableOpacity>
    );
  };

  const flagPress = () => {
    setUserFlagMessage(null);
    setUserFlagVisible(true);
  };

  const renderFooter = () => {
    if (!loading) return <View style={{ height: 50 }} />;
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Cargando mas...</ThemedText>
      </View>
    );
  };

  return (
    <HorizontallyAligned>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 }}>
        <DropDownPicker
          open={exitPickerOpen}
          style={{
            backgroundColor: 'black',
            width: 150,
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: '#333',
            borderRadius: 15,
          }}
          labelStyle={{
            color: 'white',
            fontSize: 16
          }}
          dropDownContainerStyle={{
            backgroundColor: 'black',
            width: 150,
            borderColor: '#333',
            borderRadius: 15
          }}
          listItemLabelStyle={{
            color: 'white',
          }}
          setOpen={setExitPickerOpen}
          value={selectedExitId}
          setValue={setSelectedExitId}
          items={exits?.map(exit => ({
            label: exit.name,
            value: exit.id
          })) || []}
        />

        <TouchableOpacity onPress={() => router.push("/messages")}>
          <View style={{ position: 'relative' }}>
            <Feather name='send' size={24} color='white' />
            {messageSummaries && messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length > 0 && (
              <Badge value={messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length} containerStyle={{ position: 'absolute', top: 5, left: 60 }} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Animated.View style={{
        backgroundColor: 'black',
        marginTop: 10,
        borderRadius: 15,
        width: '100%',
        height: buttonHeight,
      }}>
        <TouchableOpacity onPress={() => router.push("/places?selectedExitId=" + selectedExitId)} style={{
          width: '100%',
          height: '100%',
        }}>
          <Image source={require('../../assets/images/club.jpeg')} style={{ width: '100%', height: '100%', borderRadius: 15, opacity: 0.4 }} />
          <ThemedText style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            textTransform: 'uppercase'
          }}>
            Bares, clubs y discos
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={visitors}
        renderItem={renderVisitor}
        keyExtractor={(item) => item}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <ThemedText type='title' style={{ alignSelf: 'center', marginTop: 10 }}>¿Quien sale a {api.getLocationName(exits?.find(e => e.id == selectedExitId)?.locationId || '')}?</ThemedText>
            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, marginBottom: 10 }}>
              <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
            </View>
          </>
        }
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      />

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
          <StyledModal isModalVisible={isUserModalVisible} setIsModalVisible={setIsUserModalVisible} includeButton={!userFlagVisible} topRightElement={(userFlagVisible || selectedProfile.userName == userProfile?.userName) ? undefined : {
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
                    <FastImage source={{ uri: api.getPfpFromCache(selectedProfile.userName) }} style={styles.modalProfilePicture} />
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
                    <TouchableOpacity
                      style={[styles.likeButton, { position: 'absolute', bottom: 10, right: 10 }]}
                      onPress={async (e) => {
                        e.stopPropagation();
                        handleLike(selectedProfile.userName, selectedProfile.exitId, !likedUsers.has(selectedProfile.userName));
                      }}
                    >
                      {likedUsers.has(selectedProfile.userName) ? (
                        <FontAwesome name="heart" size={20} color="#FF4444" />
                      ) : (
                        <FontAwesome name="heart-o" size={20} color="white" />
                      )}
                    </TouchableOpacity>
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
                      <ThemedText>{dateListDisplay(selectedProfile.dates)}</ThemedText>
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

                  {selectedProfile.with && selectedProfile.with.length > 0 && (
                    <ThemedText style={{ marginTop: 10 }}>Va con:</ThemedText>
                  )}

                  {/* Render profiles of users that go with the selected profile */}
                  <View style={styles.invitedUsersContainer}>
                    {selectedProfile.with?.map((friend) => {
                      return (
                        <View key={"friend_" + friend.displayName} style={styles.invitedUserCard}>
                          <FastImage source={{ uri: friend.pfpUrl }} style={styles.invitedUserProfilePicture} />
                          <ThemedText>{friend.displayName}</ThemedText>
                        </View>
                      );
                    })}
                  </View>

                  <BtnPrimary title='Mensaje' onClick={() => { router.push(`/messages?selectedUser=${selectedProfile.userName}`); setSelectedProfile(null); }} />
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
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
    padding: 10,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
});
