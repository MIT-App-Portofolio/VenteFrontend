import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking, FlatList, RefreshControl, SafeAreaView, Platform, ActivityIndicator, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BtnPrimary, BtnSecondary } from '@/components/Buttons';
import { CenterAligned } from '@/components/CenterAligned';
import { ExitUserQuery, useApi } from '@/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { StyledModal } from '@/components/StyledModal';
import { dateListDisplay, dateShortDisplay } from '@/dateDisplay';
import { pfpSize, styles as indexStyles } from './index';

export default function EventFeed() {
  const { exitId, eventId } = useLocalSearchParams<{ exitId: string, eventId: string }>();
  const router = useRouter();

  const { api, userProfile, hasPfp, friends, outgoingSolicitations } = useApi();

  // State management
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ExitUserQuery | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);
  const [likedUsers, setLikedUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const [eventName, setEventName] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<string>>(null);

  // Fetch event name
  const fetchEventName = useCallback(async () => {
    if (!exitId || !eventId) return;

    try {
      const eventPlaces = await api.queryEventPlaces(parseInt(exitId));
      if (eventPlaces) {
        // Find the event in all event places
        for (const place of eventPlaces) {
          const event = place.events.find(e => e.id === parseInt(eventId));
          if (event) {
            setEventName(event.name);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching event name:', error);
    }
  }, [api, exitId, eventId]);

  // Fetch event attendees
  const fetchAttendees = useCallback(async () => {
    if (!exitId || !eventId) return;

    setLoading(true);
    try {
      const newAttendees = await api.getEventAttendees(parseInt(exitId), parseInt(eventId));
      if (newAttendees) {
        // Fetch profile pictures for all attendees
        await Promise.all(newAttendees.map(attendee => api.fetchPfp(attendee)));

        // Update likedUsers state with likes from attendees
        setLikedUsers(prev => {
          const newSet = new Set(prev);
          newAttendees.forEach(attendee => {
            const user = api.getUserCached(attendee) as ExitUserQuery;
            if (user?.userLiked) {
              newSet.add(user.userName);
            }
          });
          return newSet;
        });

        setAttendees(newAttendees);
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  }, [api, exitId, eventId]);

  // Initial fetch
  useEffect(() => {
    if (exitId && eventId) {
      fetchEventName();
      fetchAttendees();
    }
  }, [exitId, eventId, fetchEventName, fetchAttendees]);

  // Refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLikedUsers(new Set()); // Reset likes on refresh
    await fetchAttendees();
    setRefreshing(false);
  }, [fetchAttendees]);

  const handleProfileClick = (profile: ExitUserQuery) => {
    setSelectedProfile(profile);
    setIsUserModalVisible(true);
  };

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

  const flagPress = () => {
    setUserFlagMessage(null);
    setUserFlagVisible(true);
  };

  const renderAttendee = ({ item }: { item: string }) => {
    var attendee = api.getUserCached(item) as ExitUserQuery;
    var pfpUrl = api.getPfpFromCache(item);

    if (attendee == null) {
      return null;
    }

    const displayName = attendee.name || `@${attendee.userName}`;
    const isLiked = likedUsers.has(attendee.userName);

    return (
      <TouchableOpacity style={indexStyles.card} onPress={() => handleProfileClick(attendee!)}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: pfpUrl }}
            style={indexStyles.profilePicture}
            blurRadius={!hasPfp ? 20 : 0}
          />
          {!hasPfp && (
            <View style={indexStyles.blurMessageContainer}>
              <ThemedText style={indexStyles.blurMessage}>
                Sube tu foto de perfil para ver la de los demás
              </ThemedText>
            </View>
          )}
          {attendee.note && (
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
                {attendee.note}
              </ThemedText>
            </View>
          )}
          <TouchableOpacity
            style={[indexStyles.likeButton, { position: 'absolute', bottom: 10, right: 10 }]}
            onPress={async (e) => {
              e.stopPropagation();
              handleLike(attendee.userName, attendee.exitId, !isLiked);
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
            {attendee.verified && (
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
            <ThemedText>{attendee.dates.length == 1 ? dateShortDisplay(attendee.dates[0]) : attendee.dates.length + " fechas"}</ThemedText>
          </View>

          <View style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center'
          }}>
            {attendee.years &&
              <ThemedText>{attendee.years} años</ThemedText>
            }

            {
              attendee.igHandle && (
                <View style={indexStyles.igContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <ThemedText type='link' style={{ marginLeft: 2 }} ellipsizeMode='tail' numberOfLines={1}>{attendee.igHandle}</ThemedText>
                </View>
              )
            }
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return <View style={{ height: 50 }} />;
    return (
      <View style={indexStyles.loadingContainer}>
        <ThemedText>Cargando...</ThemedText>
      </View>
    );
  };

  if (!exitId || !eventId) {
    return (
      <SafeAreaView style={{ flex: 1, marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        <CenterAligned>
          <ThemedText>Error: No se encontró información del evento</ThemedText>
          <BtnPrimary title='Volver' onClick={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/places?selectedExitId=' + exitId);
            }
          }}></BtnPrimary>
        </CenterAligned>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 10, width: '100%', paddingHorizontal: 10 }}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/places?selectedExitId=' + exitId);
            }
          }}>
            <ThemedText style={styles.backButton}>←</ThemedText>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={attendees}
          renderItem={renderAttendee}
          keyExtractor={(item) => item}
          ListHeaderComponent={
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={{ maxWidth: '100%', paddingHorizontal: 10 }}>
                <ThemedText type='title' style={{ textAlign: 'center', marginTop: 10 }}>
                  {eventName ? `¿Quién va a ${eventName}?` : '¿Quién asiste a este evento?'}
                </ThemedText>
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
                  <ScrollView style={indexStyles.modalContent}>
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: api.getPfpFromCache(selectedProfile.userName) }}
                        style={indexStyles.modalProfilePicture}
                        blurRadius={!hasPfp ? 20 : 0}
                      />
                      {!hasPfp && (
                        <View style={[indexStyles.blurMessageContainer, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                          <ThemedText style={indexStyles.blurMessage}>
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
                        style={[indexStyles.likeButton, { position: 'absolute', bottom: 10, right: 10 }]}
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
                      <View style={indexStyles.modalIgContainer}>
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
                    <View style={indexStyles.invitedUsersContainer}>
                      {selectedProfile.with?.map((friend) => {
                        return (
                          <View key={"friend_" + friend.displayName} style={indexStyles.invitedUserCard}>
                            <Image source={{ uri: friend.pfpUrl }} style={indexStyles.invitedUserProfilePicture} />
                            <ThemedText>{friend.displayName}</ThemedText>
                          </View>
                        );
                      })}
                    </View>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    fontSize: 24,
    color: 'white',
  },
});
