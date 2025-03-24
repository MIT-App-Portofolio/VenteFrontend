import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Animated, RefreshControl } from 'react-native';
import { MarginItem } from '@/components/MarginItem';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { CenterAligned } from '@/components/CenterAligned';
import { useApi } from '@/api';
import { Redirect, useRouter } from 'expo-router';
import { Profile } from '@/api';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { StyledGenderFilter } from '@/components/GenderPicker';
import { StyledModal } from '@/components/StyledModal';
import { redirectStore } from '@/redirect_storage';
import FastImage from 'react-native-fast-image';
import { dateTimeShortDisplay } from '@/dateDisplay';

export default function Users() {
  var pendingRedirect = redirectStore.getPendingRedirect();
  if (pendingRedirect) {
    // expo-router is a clusterfuck. i don't know how you're supposed to handle but this is the most painless way, as there's no way to not make index.tsx the default
    return <Redirect href={pendingRedirect} />
  }

  const { api, userProfile } = useApi();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [visitors, setVisitors] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [lastUserFetchEmpty, setLastUserFetchEmpty] = useState(false);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<number | null>(null);
  const [ageRangeMax, setAgeRangeMax] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // View event places button interpolation
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [160, 40],
    extrapolate: 'clamp',
  });

  const fetchedFirstTime = useRef(false);
  useEffect(() => {
    fetchedFirstTime.current = true;
    setLastUserFetchEmpty(false);
    setPage(0);
    setVisitors([]);
    fetchVisitors(true);
  }, [userProfile?.eventStatus]);

  useEffect(() => {
    if (!fetchedFirstTime.current) {
      fetchVisitors();
    }
    fetchedFirstTime.current = false;
  }, [page]);

  useEffect(() => {
    visitors.forEach(visitor => {
      var profile = api.getUserUnstable(visitor);
      if (profile.eventStatus.with) {
        profile.eventStatus.with.forEach(async withUser => {
          if (!api.hasUser(withUser)) {
            // These functions would cache the respective values so that they can be accessed with unstable functions
            await api.getUser(withUser);
            await api.fetchPfp(withUser);
          }
        });
      }
    });
  }, [visitors]);

  const fetchVisitors = async (overrideLastFetch?: boolean) => {
    if (!overrideLastFetch && lastUserFetchEmpty) {
      return;
    }

    const newVisitors = await api.queryVisitors(page, genderFilter, ageRangeMin, ageRangeMax);

    if (!newVisitors || newVisitors.length === 0) {
      setLastUserFetchEmpty(true);
    }

    if (newVisitors) {
      await Promise.all(newVisitors.map(visitor => api.fetchPfp(visitor)));
      if (overrideLastFetch) {
        setVisitors(newVisitors);
      } else {
        setVisitors(prevVisitors => [...prevVisitors, ...newVisitors]);
      }
    }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVisitors(true);
    setRefreshing(false);
  }, []);

  const handleScroll = (event: any) => {
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    )(event);

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom && !loading) {
      setPage(page + 1);
    }
  };

  const applyFilter = async () => {
    setLoading(true);
    setPage(0);
    setLastUserFetchEmpty(false);
    setVisitors([]);

    await fetchVisitors();

    setIsFilterModalVisible(false);
    setLoading(false);
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsUserModalVisible(true);
  };

  if (loading)
    return (
      <CenterAligned>
        <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
      </CenterAligned>
    );

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
      <TouchableOpacity key={visitor.userName} style={styles.card} onPress={() => handleProfileClick(visitor!)}>
        <FastImage source={{ uri: pfpUrl }} style={styles.profilePicture} />
        <View style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
          <ThemedText type="subtitle" style={{ marginTop: 5 }}>{displayName}</ThemedText>
          <View style={{
            flexDirection: 'row',
            gap: 2,
            alignItems: 'center',
          }}>
            <Feather name='calendar' size={16} color='white' />
            <ThemedText>{dateTimeShortDisplay(new Date(visitor.eventStatus.time!))}</ThemedText>
          </View>

          <View style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center'
          }}>
            <ThemedText>{visitor.years} años</ThemedText>

            {
              visitor.igHandle && (
                <View style={styles.igContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <ThemedText type='link' style={{ marginLeft: 2 }}>{visitor.igHandle}</ThemedText>
                </View>
              )
            }
          </View>
        </View >
      </TouchableOpacity >
    );
  };


  return (
    <HorizontallyAligned>
      {/* Normal view */}
      <Animated.View style={{
        backgroundColor: 'black',
        marginTop: 10,
        borderRadius: 15,
        width: '100%',
        height: buttonHeight,
      }}>
        <TouchableOpacity onPress={() => router.push("/places")} style={{
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
            Ver Lugares de Eventos
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <ThemedText type='title' style={{ alignSelf: 'flex-start', marginTop: 10 }}>Usuarios que también van a {userProfile.eventStatus.location?.name}</ThemedText>

        <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, marginBottom: 10 }}>
          <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
        </View>

        <CenterAligned>
          {visitors.map((value, _1, _2) => renderVisitor({ item: value }))}
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
          <StyledModal isModalVisible={isUserModalVisible} setIsModalVisible={setIsUserModalVisible}>
            <ScrollView style={styles.modalContent}>
              <FastImage source={{ uri: api.getPfpUnstable(selectedProfile.userName) }} style={styles.modalProfilePicture} />

              <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                {
                  selectedProfile.name &&
                  <ThemedText style={{ marginRight: 10 }} type="title">{selectedProfile.name}</ThemedText>
                }

                <ThemedText style={{ color: 'gray' }}>@{selectedProfile.userName}</ThemedText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <ThemedText style={{ marginTop: 10 }}>{selectedProfile.years} años</ThemedText>

                <View style={{
                  flexDirection: 'row',
                  gap: 2,
                  alignItems: 'center',
                }}>
                  <Feather name='calendar' size={16} color='white' />
                  <ThemedText>{dateTimeShortDisplay(new Date(selectedProfile.eventStatus.time!))}</ThemedText>
                </View>
              </View>

              <ThemedText style={{ marginTop: 5 }}>{selectedProfile.description}</ThemedText>

              {selectedProfile.igHandle && (
                <View style={styles.modalIgContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <ThemedText type="link" style={{ marginLeft: 3 }} onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}>
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
          </StyledModal>
        )
      }
    </HorizontallyAligned >
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
    width: 250,
    height: 250,
    borderRadius: 10,
  },
  igContainer: {
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
