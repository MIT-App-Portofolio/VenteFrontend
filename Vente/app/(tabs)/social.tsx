import { ThemedText } from "@/components/ThemedText";
import { View, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, FlatList, TextInput, Animated, Keyboard, Linking } from "react-native";
import { useApi, FriendStatus } from "@/api";
import { useEffect, useState, useRef } from "react";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import { StyledModal } from "@/components/StyledModal";
import { CenterAligned } from "@/components/CenterAligned";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import FastImage from "react-native-fast-image";
import Toast from "react-native-toast-message";
import { dateListDisplay } from "@/dateDisplay";
import { router } from "expo-router";

export default function Social() {
  const { api, incomingSolicitations, friends, outgoingSolicitations, statuses, userProfile } = useApi();
  const [selectedModal, setSelectedModal] = useState<'friends' | 'incoming' | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingSolicitations, setAcceptingSolicitations] = useState<{ [key: string]: boolean }>({});
  const [rejectingSolicitations, setRejectingSolicitations] = useState<{ [key: string]: boolean }>({});
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Add new state variables for user profile modal
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getFriends();
    api.getIncomingSolicitations();
    api.getOutgoingSolicitations();
  }, []);

  useEffect(() => {
    api.getStatuses();
  }, [friends]);

  useEffect(() => {
    const fetchAllPfps = async () => {
      await Promise.all([
        ...(incomingSolicitations?.map(solicitation =>
          api.fetchPfp(solicitation.username)
        ) || []),
        ...(outgoingSolicitations?.map(solicitation =>
          api.fetchPfp(solicitation.username)
        ) || []),
        ...(friends?.map(friend =>
          api.fetchPfp(friend.username)
        ) || [])
      ]);
    };

    fetchAllPfps();
  }, [friends, incomingSolicitations, outgoingSolicitations]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await api.searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleAcceptSolicitation = async (username: string) => {
    setAcceptingSolicitations(prev => ({ ...prev, [username]: true }));
    await api.acceptSolicitation(username);
    await api.getFriends();
    await api.getIncomingSolicitations();
    setAcceptingSolicitations(prev => ({ ...prev, [username]: false }));
  };

  const handleRejectSolicitation = async (username: string) => {
    setRejectingSolicitations(prev => ({ ...prev, [username]: true }));
    await api.rejectSolicitation(username);
    await api.getIncomingSolicitations();
    setRejectingSolicitations(prev => ({ ...prev, [username]: false }));
  };

  const handleUnfriend = async (username: string) => {
    setFollowLoading(prev => ({ ...prev, [username]: true }));
    await api.unfollowUser(username);
    await api.getFriends();
    setFollowLoading(prev => ({ ...prev, [username]: false }));
  };

  const handleFollow = async (username: string) => {
    setFollowLoading(prev => ({ ...prev, [username]: true }));
    await api.followUser(username);
    await api.getOutgoingSolicitations();
    setFollowLoading(prev => ({ ...prev, [username]: false }));
  };

  const handleCancel = () => {
    setSearchFocused(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleProfileClick = async (username: string) => {
    const profile = await api.getUser(username);
    setSelectedProfile(profile);
  };

  const flagPress = () => {
    setUserFlagMessage(null);
    setUserFlagVisible(true);
  };

  const renderButton = (title: string, count: number, type: 'friends' | 'incoming') => (
    <TouchableOpacity
      style={styles.button}
      onPress={() => setSelectedModal(type)}
    >
      <View style={styles.buttonContent}>
        <ThemedText style={styles.buttonTitle}>{title}</ThemedText>
        <ThemedText style={styles.buttonCount}>{count}</ThemedText>
      </View>
      <Feather name="chevron-right" size={24} color="white" />
    </TouchableOpacity>
  );

  const renderStatusCard = ({ item }: { item: FriendStatus }) => (
    <TouchableOpacity
      style={styles.statusCard}
      onPress={() => handleProfileClick(item.username)}
    >
      <View style={styles.statusContent}>
        <FastImage
          source={{ uri: item.pfpUrl }}
          style={styles.profilePicture}
        />
        <View style={styles.statusText}>
          <ThemedText style={styles.username}>{item.name || "@" + item.username}</ThemedText>
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={16} color="white" />
            <ThemedText style={styles.location}>{api.getLocationName(item.locationId)}</ThemedText>
          </View>
          <View style={styles.dateContainer}>
            <Feather name="calendar" size={16} color="white" />
            <ThemedText style={styles.date}>{dateListDisplay(item.dates)}</ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFriendCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleProfileClick(item.username)}
    >
      <View style={styles.cardContent}>
        <FastImage
          source={{ uri: api.getPfpFromCache(item.username) }}
          style={styles.profilePicture}
        />
        <View style={styles.cardText}>
          <ThemedText style={styles.username}>@{item.username}</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleUnfriend(item.username);
          }}
          disabled={loading}
        >
          <Feather name="user-minus" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSolicitationCard = ({ item }: { item: any }) => {
    const isAccepting = acceptingSolicitations[item.username] || false;
    const isRejecting = rejectingSolicitations[item.username] || false;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleProfileClick(item.username)}
      >
        <View style={styles.cardContent}>
          <FastImage
            source={{ uri: api.getPfpFromCache(item.username) }}
            style={styles.profilePicture}
          />
          <View style={styles.cardText}>
            <ThemedText style={styles.username}>@{item.username}</ThemedText>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, isAccepting && styles.loadingButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptSolicitation(item.username);
              }}
              disabled={isAccepting || isRejecting}
            >
              {isAccepting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="check" size={20} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isRejecting && styles.loadingButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleRejectSolicitation(item.username);
              }}
              disabled={isAccepting || isRejecting}
            >
              {isRejecting ? (
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

  const renderSearchResult = ({ item }: { item: any }) => {
    const isFriend = friends?.some(f => f.username === item.username);
    const hasOutgoingRequest = outgoingSolicitations?.some(s => s.username === item.username);
    const isLoading = followLoading[item.username] || false;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleProfileClick(item.username)}
      >
        <View style={styles.cardContent}>
          <FastImage
            source={{ uri: item.pfpUrl }}
            style={styles.profilePicture}
          />
          <View style={styles.cardText}>
            <ThemedText style={styles.username}>@{item.username}</ThemedText>
          </View>
          {isFriend ? (
            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.loadingButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleUnfriend(item.username);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="user-minus" size={20} color="white" />
              )}
            </TouchableOpacity>
          ) : hasOutgoingRequest ? (
            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.loadingButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleFollow(item.username);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="x" size={20} color="white" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.loadingButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleFollow(item.username);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Feather name="user-plus" size={20} color="white" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            placeholderTextColor="gray"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setSearchFocused(true)}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {isSearching && (
            <ActivityIndicator style={styles.searchLoading} color="white" />
          )}
        </View>
        {searchFocused && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {searchFocused ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={item => item.username}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <CenterAligned>
              <ThemedText style={{ marginTop: 20 }}>
                {searchQuery.length < 2 ? "Escribe al menos 2 caracteres" : "No se encontraron usuarios"}
              </ThemedText>
            </CenterAligned>
          }
        />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <CenterAligned>
            <View style={{ width: '100%', maxWidth: 500 }}>
              {renderButton('Amigos', friends?.length || 0, 'friends')}
              {renderButton('Solicitudes de amistad', incomingSolicitations?.length || 0, 'incoming')}

              {statuses && statuses.length > 0 && (
                <View style={styles.statusSection}>
                  <ThemedText style={styles.statusSectionTitle}>¿Que hacen tus amigos?</ThemedText>
                  <FlatList
                    data={statuses}
                    renderItem={renderStatusCard}
                    keyExtractor={item => `${item.name || "@" + item.username}-${item.dates[0]}`}
                    style={{ width: '100%' }}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </View>
          </CenterAligned>
        </ScrollView>
      )}

      {/* Single Modal with Conditional Content */}
      <StyledModal
        isModalVisible={selectedModal !== null || selectedProfile !== null}
        setIsModalVisible={() => {
          setSelectedModal(null);
          setSelectedProfile(null);
          setUserFlagVisible(false);
        }}
        includeButton={!userFlagVisible}
        topRightElement={
          selectedProfile && !userFlagVisible && selectedProfile.userName !== userProfile?.userName
            ? {
              icon: "flag",
              onPress: flagPress,
            }
            : undefined
        }
      >
        {selectedProfile ? (
          userFlagVisible ? (
            <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
              {userFlagMessage ? (
                <ThemedText>{userFlagMessage}</ThemedText>
              ) : (
                <View style={{ flexDirection: 'column', gap: 5 }}>
                  <BtnPrimary
                    title='Reportar usuario'
                    disabled={userFlagLoading}
                    onClick={async () => {
                      setUserFlagLoading(true);
                      const success = await api.report(selectedProfile.userName);
                      if (success) {
                        setUserFlagMessage('Usuario reportado');
                      } else {
                        setUserFlagMessage('Algo fue mal...');
                      }
                      setUserFlagLoading(false);
                    }}
                  />
                  <BtnPrimary
                    title='Bloquear usuario'
                    disabled={userFlagLoading}
                    onClick={async () => {
                      setUserFlagLoading(true);
                      const success = await api.block(selectedProfile.userName);
                      if (success) {
                        setUserFlagMessage('Usuario bloqueado. Ya no podrá enviarte mensajes.');
                      } else {
                        setUserFlagMessage('Algo fue mal...');
                      }
                      setUserFlagLoading(false);
                    }}
                  />
                </View>
              )}
              <BtnSecondary
                title={userFlagMessage ? "Cerrar" : "Cancelar"}
                onClick={() => setUserFlagVisible(false)}
              />
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={{ position: 'relative' }}>
                <FastImage
                  source={{ uri: api.getPfpFromCache(selectedProfile.userName) }}
                  style={styles.modalProfilePicture}
                />
                {selectedProfile.note && (
                  <View style={styles.noteContainer}>
                    <ThemedText style={{ fontSize: 14, maxWidth: 140 }}>
                      {selectedProfile.note}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                {selectedProfile.name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={{ marginRight: 10 }} type="title">
                      {selectedProfile.name}
                    </ThemedText>
                    {selectedProfile.verified && (
                      <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                        <Ionicons name="checkmark" size={16} color="white" />
                      </View>
                    )}
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ThemedText style={{ color: 'gray' }}>@{selectedProfile.userName}</ThemedText>
                  {(selectedProfile.verified && !selectedProfile.name) && (
                    <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  )}
                </View>
              </View>

              {selectedProfile.years && (
                <ThemedText style={{ marginTop: 10 }}>{selectedProfile.years} años</ThemedText>
              )}

              {selectedProfile.description && (
                <ThemedText style={{ marginTop: 5 }}>{selectedProfile.description}</ThemedText>
              )}

              {selectedProfile.igHandle && (
                <View style={styles.igContainer}>
                  <FontAwesome name="instagram" size={16} color="white" />
                  <ThemedText
                    type="link"
                    style={{ marginLeft: 3 }}
                    onPress={() => Linking.openURL(`https://www.instagram.com/${selectedProfile.igHandle}`)}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                  >
                    {selectedProfile.igHandle}
                  </ThemedText>
                </View>
              )}

              <BtnPrimary
                title='Mensaje'
                onClick={() => {
                  router.push(`/messages?selectedUser=${selectedProfile.userName}`);
                  setSelectedProfile(null);
                }}
              />
            </View>
          )
        ) : selectedModal === 'friends' ? (
          <CenterAligned>
            <ThemedText type="title">Amigos</ThemedText>
            {friends && friends.length > 0 ? (
              <FlatList
                data={friends}
                renderItem={renderFriendCard}
                keyExtractor={item => item.username}
                style={{ width: '100%', marginTop: 20 }}
              />
            ) : (
              <ThemedText style={{ marginTop: 20 }}>No tienes amigos aún</ThemedText>
            )}
          </CenterAligned>
        ) : selectedModal === 'incoming' ? (
          <CenterAligned>
            <ThemedText type="title">Solicitudes de amistad</ThemedText>
            {incomingSolicitations && incomingSolicitations.length > 0 ? (
              <FlatList
                data={incomingSolicitations}
                renderItem={renderSolicitationCard}
                keyExtractor={item => item.username}
                style={{ width: '100%', marginTop: 20 }}
              />
            ) : (
              <ThemedText style={{ marginTop: 20 }}>No tienes solicitudes pendientes</ThemedText>
            )}
          </CenterAligned>
        ) : null}
      </StyledModal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  buttonCount: {
    fontSize: 14,
    color: 'gray',
  },
  card: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: 15,
  },
  username: {
    color: 'white',
    fontSize: 16,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  actionButton: {
    backgroundColor: '#3A3A3A',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  loadingButton: {
    backgroundColor: '#4A4A4A',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    paddingRight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    color: 'white',
    fontSize: 16,
  },
  searchLoading: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  cancelButton: {
    marginLeft: 10,
    padding: 10,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  statusSection: {
    marginTop: 20,
    width: '100%',
  },
  statusSectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginBottom: 10,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    flex: 1,
    marginLeft: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    marginTop: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: 'white',
  },
  date: {
    fontSize: 14,
    color: 'gray',
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
  noteContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  igContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});