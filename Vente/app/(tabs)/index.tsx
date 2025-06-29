import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput, Animated, Image, FlatList, RefreshControl, SafeAreaView, PanResponder, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { MarginItem } from '@/components/MarginItem';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { HorizontallyAligned } from '@/components/HorizontallyAligned';
import { CenterAligned } from '@/components/CenterAligned';
import { ExitUserQuery, useApi, SearchUser, CurrentNews, ExitUserQueryEvent } from '@/api';
import { Redirect, useRootNavigationState, useRouter } from 'expo-router';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { StyledGenderFilter } from '@/components/GenderPicker';
import { StyledModal } from '@/components/StyledModal';
import FastImage from 'react-native-fast-image';
import { dateListDisplay, dateShortDisplay } from '@/dateDisplay';
import DropDownPicker from 'react-native-dropdown-picker';
import { Badge } from 'react-native-elements/dist/badge/Badge';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const pfpSize = 250;

export default function Users() {
  const router = useRouter();

  const { api, exits, userProfile, messageSummaries, notifications, friends, outgoingSolicitations, customOffers, hasPfp } = useApi();

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
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});

  const [showEventAttendanceMessage, setShowEventAttendanceMessage] = useState(false);

  const [selectedExitId, setSelectedExitId] = useState<number | null>(null);

  const [exitPickerOpen, setExitPickerOpen] = useState(false);

  const [currentNews, setCurrentNews] = useState<CurrentNews | null>(null);
  const [isNewsModalVisible, setIsNewsModalVisible] = useState(false);
  const [dismissedNewsIds, setDismissedNewsIds] = useState<Set<string>>(new Set());
  const [dismissedEventMessage, setDismissedEventMessage] = useState(false);

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

  useEffect(() => {
    const f = async () => {
      if (selectedExitId == null) return;

      // fetch news, check if a news with uniqueId has already been dismissed and if not, show it
      const news = await api.getCurrentNews(selectedExitId);
      if (news && !dismissedNewsIds.has(news.uniqueId)) {
        // Double check storage to ensure we have the latest dismissed IDs
        try {
          const stored = await AsyncStorage.getItem('dismissedNewsIds');
          if (stored) {
            const storedIds = new Set(JSON.parse(stored));
            if (!storedIds.has(news.uniqueId)) {
              setCurrentNews(news);
              setIsNewsModalVisible(true);
            }
          } else {
            setCurrentNews(news);
            setIsNewsModalVisible(true);
          }
        } catch (e) {
          console.log('Error checking stored dismissed news:', e);
          // If there's an error reading storage, show the news anyway
          setCurrentNews(news);
          setIsNewsModalVisible(true);
        }
      }
    }
    f();
  }, [selectedExitId, dismissedNewsIds]);

  useEffect(() => {
    const f = async () => {
      if (selectedExitId) {
        const showEventAttendanceMessage = await api.getShowEventAttendanceMessage(selectedExitId);
        setShowEventAttendanceMessage(showEventAttendanceMessage);
      } else {
        setShowEventAttendanceMessage(false);
      }
    }
    f();
  }, [selectedExitId]);

  // Load dismissed news IDs from storage on mount
  useEffect(() => {
    const loadDismissedNews = async () => {
      try {
        const stored = await AsyncStorage.getItem('dismissedNewsIds');
        if (stored) {
          setDismissedNewsIds(new Set(JSON.parse(stored)));
        }
      } catch (e) {
        console.log('Error loading dismissed news:', e);
      }
    };
    loadDismissedNews();
  }, []);

  // Load dismissed event message from storage on mount
  useEffect(() => {
    const loadDismissedEventMessage = async () => {
      try {
        const stored = await AsyncStorage.getItem('dismissedEventMessage');
        if (stored === 'true') {
          setDismissedEventMessage(true);
        }
      } catch (e) {
        console.log('Error loading dismissed event message:', e);
      }
    };
    loadDismissedEventMessage();
  }, []);

  // Save dismissed news IDs to storage when they change
  useEffect(() => {
    const saveDismissedNews = async () => {
      try {
        await AsyncStorage.setItem('dismissedNewsIds', JSON.stringify([...dismissedNewsIds]));
      } catch (e) {
        console.log('Error saving dismissed news:', e);
      }
    };
    saveDismissedNews();
  }, [dismissedNewsIds]);

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
        // Deduplicate newVisitors using Set
        const uniqueNewVisitors = [...new Set(newVisitors)];

        // Fetch profile pictures for all new visitors
        await Promise.all(uniqueNewVisitors.map(visitor => api.fetchPfp(visitor)));

        // Update likedUsers state with likes from new visitors
        setLikedUsers(prev => {
          const newSet = new Set(prev);
          uniqueNewVisitors.forEach(visitor => {
            const user = api.getUserCached(visitor) as ExitUserQuery;
            if (user?.userLiked) {
              newSet.add(user.userName);
            }
          });
          return newSet;
        });

        setVisitors(prev => {
          if (shouldReset) {
            return uniqueNewVisitors;
          }
          // Filter out any visitors that are already in the list
          const uniqueVisitors = uniqueNewVisitors.filter(visitor => !prev.includes(visitor));
          return [...prev, ...uniqueVisitors];
        });
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

  const handleFollow = useCallback(async (username: string) => {
    setFollowLoading(prev => ({ ...prev, [username]: true }));
    const hasOutgoingRequest = outgoingSolicitations?.some(s => s.username === username);
    if (hasOutgoingRequest) {
      await api.unfollowUser(username);
    } else {
      await api.followUser(username);
    }
    await api.getOutgoingSolicitations();
    setFollowLoading(prev => ({ ...prev, [username]: false }));
  }, [api, outgoingSolicitations]);

  const handleUnfriend = useCallback(async (username: string) => {
    setFollowLoading(prev => ({ ...prev, [username]: true }));
    await api.unfollowUser(username);
    await api.getFriends();
    setFollowLoading(prev => ({ ...prev, [username]: false }));
  }, [api]);

  // Fetch friends and solicitations on mount
  useEffect(() => {
    api.getFriends();
    api.getOutgoingSolicitations();
  }, []);

  // View event places button interpolation
  const buttonHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [160, 40],
    extrapolate: 'clamp',
  });

  const renderBadges = () => {
    return (
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <TouchableOpacity onPress={() => {
          router.push("/offers");
        }}>
          <View style={{ position: 'relative' }}>
            <Feather name='tag' size={24} color='white' />
            {customOffers && customOffers.length > 0 && (
              <Badge value={customOffers.length} containerStyle={{ position: 'absolute', top: -5, right: -5 }} badgeStyle={{ backgroundColor: 'red', borderWidth: 0 }} textStyle={{ color: 'white' }} status='error' />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          router.push("/notifications");
          api.markNotificationsAsRead();
        }}>
          <View style={{ position: 'relative' }}>
            <Feather name='bell' size={24} color='white' />
            {notifications && notifications.filter(notif => !notif.read).length > 0 && (
              <Badge value={notifications.filter(notif => !notif.read).length} containerStyle={{ position: 'absolute', top: -5, right: -5 }} badgeStyle={{ backgroundColor: 'red', borderWidth: 0 }} textStyle={{ color: 'white' }} status='error' />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/messages")}>
          <View style={{ position: 'relative' }}>
            <Feather name='send' size={24} color='white' />
            {messageSummaries && messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length > 0 && (
              <Badge value={messageSummaries.filter(msg => msg.read === false && msg.type === 'Incoming').length} containerStyle={{ position: 'absolute', top: -5, right: -5 }} badgeStyle={{ backgroundColor: 'red', borderWidth: 0 }} textStyle={{ color: 'white' }} status='error' />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!selectedExitId || exits?.length == 0) {
    return (
      <SafeAreaView style={{ flex: 1, marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        <View style={{ width: '100%', alignItems: 'flex-end', paddingHorizontal: 10 }}>
          {renderBadges()}
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
          <Image
            source={{ uri: pfpUrl }}
            style={styles.profilePicture}
            blurRadius={!hasPfp ? 20 : 0}
          />
          {!hasPfp && (
            <View style={styles.blurMessageContainer}>
              <ThemedText style={styles.blurMessage}>
                Sube tu foto de perfil para ver la de los demás
              </ThemedText>
            </View>
          )}
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText type="subtitle" style={{ marginTop: 5, maxWidth: pfpSize * 0.9 }} ellipsizeMode='tail' numberOfLines={2}>{displayName}</ThemedText>
            {visitor.verified && (
              <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            )}
          </View>
          <View style={{
            flexDirection: 'row',
            gap: 2,
            alignItems: 'center',
          }}>
            <Feather name='calendar' size={16} color='white' />
            <ThemedText>{visitor.dates.length == 1 ? dateShortDisplay(visitor.dates[0]) : visitor.dates.length + " fechas"}</ThemedText>
          </View>

          {visitor.attendingEvents && visitor.attendingEvents.length > 0 &&
            <View style={{
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
              maxWidth: pfpSize * 0.9,
            }}>
              <Ionicons name="location-sharp" size={16} color="white" />
              <ThemedText ellipsizeMode='tail' numberOfLines={1}>
                {visitor.attendingEvents.length === 1
                  ? `Va a ${visitor.attendingEvents[0].name}`
                  : `Va a ${visitor.attendingEvents[0].name} y ${visitor.attendingEvents.length - 1} más`}
              </ThemedText>
            </View>
          }

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

  const handleDismissNews = async () => {
    if (currentNews) {
      const newDismissedIds = new Set([...dismissedNewsIds, currentNews.uniqueId]);
      setDismissedNewsIds(newDismissedIds);
      // Save to storage immediately
      try {
        await AsyncStorage.setItem('dismissedNewsIds', JSON.stringify([...newDismissedIds]));
      } catch (e) {
        console.log('Error saving dismissed news:', e);
      }
      setIsNewsModalVisible(false);
      setCurrentNews(null);
    }
  };

  const handleNewsAction = () => {
    if (currentNews?.path) {
      router.push(currentNews.path);
    }
    handleDismissNews();
  };

  const handleDismissEventMessage = async () => {
    setDismissedEventMessage(true);
    try {
      await AsyncStorage.setItem('dismissedEventMessage', 'true');
    } catch (e) {
      console.log('Error saving dismissed event message:', e);
    }
  };

  const handleEventMessageAction = () => {
    router.push("/places?selectedExitId=" + selectedExitId);
    handleDismissEventMessage();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <View style={{ flex: 1 }}>
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
          </View>
          <View style={{ marginLeft: 16 }}>
            {renderBadges()}
          </View>
        </View>

        {showEventAttendanceMessage && !dismissedEventMessage && (
          <View style={{
            backgroundColor: '#1A1A1A',
            marginTop: 10,
            marginHorizontal: 10,
            padding: 16,
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#007AFF',
            borderWidth: 1,
            borderColor: '#333',
          }}>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                padding: 4,
              }}
              onPress={handleDismissEventMessage}
            >
              <Feather name="x" size={18} color="#CCCCCC" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingRight: 24 }}>
              <Ionicons name="calendar" size={18} color="#007AFF" />
              <ThemedText style={{
                marginLeft: 8,
                fontSize: 16,
                fontWeight: '600',
                color: '#007AFF'
              }}>
                ¡Eventos disponibles!
              </ThemedText>
            </View>
            <ThemedText style={{
              fontSize: 14,
              color: '#CCCCCC',
              lineHeight: 18,
              marginBottom: 12
            }}>
              Elige a qué evento quieres ir para encontrar personas con intereses similares
            </ThemedText>
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
              onPress={handleEventMessageAction}
            >
              <ThemedText style={{
                color: 'white',
                fontSize: 14,
                fontWeight: '600'
              }}>
                Ver eventos ahora
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

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
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={{ maxWidth: '100%', paddingHorizontal: 10 }}>
                <ThemedText type='title' style={{ textAlign: 'center', marginTop: 10 }}>¿Quien sale a {api.getLocationName(exits?.find(e => e.id == selectedExitId)?.locationId || '')}?</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth: 500, marginTop: 10, marginBottom: 10 }}>
                <BtnPrimary title='Filtrar usuarios' onClick={() => setIsFilterModalVisible(true)} />
              </View>
            </View>
          }
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={{ paddingBottom: 50, alignItems: 'center', maxWidth: '100%' }}
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
                      <Image
                        source={{ uri: api.getPfpFromCache(selectedProfile.userName) }}
                        style={styles.modalProfilePicture}
                        blurRadius={!hasPfp ? 20 : 0}
                      />
                      {!hasPfp && (
                        <View style={[styles.blurMessageContainer, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                          <ThemedText style={styles.blurMessage}>
                            Sube tu foto de perfil para ver la de los demás
                          </ThemedText>
                        </View>
                      )}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ThemedText style={{ marginRight: 10 }} type="title">{selectedProfile.name}</ThemedText>
                          {selectedProfile.verified && (
                            <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                              <Ionicons name="checkmark" size={14} color="white" />
                            </View>
                          )}
                        </View>
                      }

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ThemedText style={{ color: 'gray' }}>@{selectedProfile.userName}</ThemedText>
                        {(selectedProfile.verified && !selectedProfile.name) && (
                          <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                            <Ionicons name="checkmark" size={14} color="white" />
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      {selectedProfile.years &&
                        <ThemedText style={{ marginTop: 10 }}>{selectedProfile.years} años</ThemedText>
                      }

                      <View style={{
                        flexDirection: 'row',
                        gap: 2,
                        alignItems: 'center',
                        maxWidth: '100%',
                      }}>
                        <Feather name='calendar' size={16} color='white' />
                        <ThemedText style={{ maxWidth: '100%' }} ellipsizeMode='tail' numberOfLines={1}>{dateListDisplay(selectedProfile.dates)}</ThemedText>
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
                            <Image source={{ uri: friend.pfpUrl }} style={styles.invitedUserProfilePicture} />
                            <ThemedText>{friend.displayName}</ThemedText>
                          </View>
                        );
                      })}
                    </View>

                    {selectedProfile.attendingEvents && selectedProfile.attendingEvents.length > 0 && (
                      <View style={{ marginTop: 20 }}>
                        <ThemedText>Va a:</ThemedText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                          {selectedProfile.attendingEvents.map((event: ExitUserQueryEvent) => (
                            <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => {
                              setIsUserModalVisible(false);
                              setIsFilterModalVisible(false);
                              setIsNewsModalVisible(false);
                              setUserFlagVisible(false);
                              router.push(`/event?exitId=${selectedExitId}&eventId=${event.id}`)
                            }}>
                              <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
                              <View style={styles.eventTextContainer}>
                                <ThemedText style={styles.eventText} numberOfLines={2}>{event.name}</ThemedText>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {selectedProfile.userName != userProfile?.userName && (
                      <>
                        <BtnPrimary
                          title='Mensaje'
                          style={{ marginBottom: 10 }}
                          onClick={() => {
                            router.push(`/messages?selectedUser=${selectedProfile.userName}`);
                            setSelectedProfile(null);
                          }}
                        />

                        {followLoading[selectedProfile.userName] ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <>
                            {friends?.some(f => f.username === selectedProfile.userName) ? (
                              <BtnSecondary
                                title='Dejar de seguir'
                                onClick={() => handleUnfriend(selectedProfile.userName)}
                                disabled={followLoading[selectedProfile.userName]}
                              />
                            ) : outgoingSolicitations?.some(s => s.username === selectedProfile.userName) ? (
                              <BtnSecondary
                                title='Solicitado'
                                onClick={() => handleFollow(selectedProfile.userName)}
                                disabled={followLoading[selectedProfile.userName]}
                              />
                            ) : (
                              <BtnSecondary
                                title='Seguir'
                                onClick={() => handleFollow(selectedProfile.userName)}
                                disabled={followLoading[selectedProfile.userName]}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </ScrollView>
                )
              }
            </StyledModal>
          )
        }

        {/* News Popup */}
        {isNewsModalVisible && (
          <View style={styles.newsPopupContainer}>
            <View style={styles.newsPopupContent}>
              <TouchableOpacity
                style={styles.newsCloseButton}
                onPress={handleDismissNews}
              >
                <Feather name="x" size={20} color="white" />
              </TouchableOpacity>
              <ThemedText type="title" style={styles.newsTitle}>{currentNews?.name}</ThemedText>
              <ThemedText style={styles.newsDescription}>{currentNews?.description}</ThemedText>
              {currentNews?.path && (
                <TouchableOpacity
                  style={styles.newsActionButton}
                  onPress={handleNewsAction}
                >
                  <ThemedText style={styles.newsActionText}>Ver más</ThemedText>
                  <Feather name="arrow-right" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView >
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
  blurMessageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  blurMessage: {
    textAlign: 'center',
    padding: 20,
    color: 'white',
    fontSize: 16,
  },
  newsPopupContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  newsPopupContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  newsCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  newsTitle: {
    fontSize: 18,
    marginBottom: 8,
    paddingRight: 24, // Space for close button
  },
  newsDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12,
  },
  newsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  newsActionText: {
    color: 'white',
    marginRight: 4,
    fontSize: 14,
  },
  eventCard: {
    width: 120,
    height: 150,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 100,
  },
  eventTextContainer: {
    padding: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});
