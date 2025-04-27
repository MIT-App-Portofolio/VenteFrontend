import { View, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../api";
import { useEffect, useRef, useState } from "react";
import { Message, Profile } from "../../api";
import { timeShortDisplay } from "../../dateDisplay";
import { ThemedText } from "@/components/ThemedText";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import React from "react";
import { Feather, FontAwesome } from '@expo/vector-icons';
import FastImage from "react-native-fast-image";
import { router, useLocalSearchParams } from "expo-router";
import { StyledModal } from "@/components/StyledModal";
import { Linking } from 'react-native';

export default function Messages() {
  const { selectedUser } = useLocalSearchParams<{ selectedUser?: string }>();

  const { api, messageSummaries, allMessages, userProfile } = useApi();
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);

  const loadingMore = useRef(false);

  const MAX_ONELINE_CHARS = 28; // heuristic: adjust as needed

  useEffect(() => {
    setLoading(true);
    api.getMessageSummaries();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      api.setOpenedDm(selectedUser);
      if (!allMessages?.[selectedUser]) {
        api.getUserMessages(selectedUser, null);
      }
      api.markRead(selectedUser);
      api.getMessageSummaries();
    } else {
      api.setOpenedDm(null);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Fetch profile info and pfp for each user in messageSummaries (by username)
    if (messageSummaries) {
      for (const summary of messageSummaries) {
        api.getUser(summary.user);
        api.fetchPfp(summary.user);
      }
    }
  }, [messageSummaries]);

  const handleProfileClick = (username: string) => {
    const profile = api.getUserCached(username) as Profile;
    if (profile) {
      setSelectedProfile(profile);
      setIsProfileModalVisible(true);
    }
  };

  const flagPress = () => {
    setUserFlagMessage(null);
    setUserFlagVisible(true);
  };

  const endReached = async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    if (selectedUser) {
      const lastMessage = allMessages?.[selectedUser]?.[allMessages?.[selectedUser]?.length - 1];
      // only send if last message is not waiting for ack
      if (lastMessage && !lastMessage.waitingForAck) {
        await api.getUserMessages(selectedUser, lastMessage.id as number);
      }
    }
    loadingMore.current = false;
  }

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    setNewMessage("");

    await api.sendMessage(selectedUser, newMessage.trim());
    await api.getMessageSummaries();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOutgoing = item.type === "Outgoing";
    // show read status if this is the last message
    const isLastMessage = isOutgoing && allMessages?.[selectedUser!]?.[0]?.id === item.id;
    const timeStr = timeShortDisplay(new Date(item.timestamp));
    const textContent = item.textContent || "";
    const oneLine = (textContent.length + timeStr.length + 2) <= MAX_ONELINE_CHARS;

    return (
      <View style={{ flexDirection: 'column', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', gap: 0, marginBottom: 8 }}>
        <View style={[
          styles.messageContainer,
          isOutgoing ? styles.outgoingMessage : styles.incomingMessage,
          { alignSelf: isOutgoing ? 'flex-end' : 'flex-start' }
        ]}>
          {oneLine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={styles.messageText}>{textContent}</ThemedText>
              <ThemedText style={[styles.messageTime, { marginTop: 0, marginLeft: 8 }]}>{timeStr}</ThemedText>
            </View>
          ) : (
            <>
              <ThemedText style={styles.messageText}>{textContent}</ThemedText>
              <ThemedText style={styles.messageTime}>{timeStr}</ThemedText>
            </>
          )}
        </View>
        {isLastMessage && item.read && <ThemedText style={styles.readStatus}>Visto</ThemedText>}
      </View>
    );
  };

  const ListFooterComponent = () => {
    if (!loadingMore.current) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black', marginBottom: 10 }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          {selectedUser ? (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                  router.push('/messages');
                }}>
                  <ThemedText style={styles.backButton}>←</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileHeader}
                  onPress={() => handleProfileClick(selectedUser)}
                >
                  <FastImage source={{ uri: api.getPfpFromCache(selectedUser) }} style={styles.chatProfilePicture} />
                  <View style={styles.profileHeaderText}>
                    <ThemedText type="defaultSemiBold">{api.getUserCached(selectedUser)?.name || `@${selectedUser}`}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={allMessages?.[selectedUser] || []}
                onEndReached={endReached}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()}
                inverted
                style={styles.messagesList}
                ListFooterComponent={ListFooterComponent}
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor="#666"
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                  <Feather name="send" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/')}>
                  <ThemedText style={styles.backButton}>←</ThemedText>
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={{ flex: 1, textAlign: 'center', fontSize: 20 }}>
                  Mensajes
                </ThemedText>
                <View style={{ width: 24 }} /> {/* Spacer to balance the header */}
              </View>
              {messageSummaries && messageSummaries.length > 0 ? (
                <FlatList
                  data={messageSummaries}
                  renderItem={({ item }) => {
                    const profile = api.getUserCached(item.user) as Profile;
                    const pfpUrl = api.getPfpFromCache(item.user);
                    const displayName = profile?.name || `@${item.user}`;

                    return (
                      <TouchableOpacity
                        style={styles.messageItem}
                        onPress={() => {
                          router.push(`/messages?selectedUser=${item.user}`);
                        }}
                        onLongPress={() => handleProfileClick(item.user)}
                      >
                        <View style={styles.profileContainer}>
                          <FastImage source={{ uri: pfpUrl }} style={styles.profilePicture} />
                          <View style={styles.messageInfo}>
                            <ThemedText type="subtitle">{displayName}</ThemedText>
                            <ThemedText style={{ color: 'gray' }}>
                              {item.textContent && item.textContent.length > MAX_ONELINE_CHARS
                                ? item.textContent.substring(0, MAX_ONELINE_CHARS) + '...'
                                : item.textContent}
                            </ThemedText>
                          </View>
                          <ThemedText style={{ color: 'gray', fontSize: 12 }}>
                            {timeShortDisplay(item.timestamp)}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={(item) => item.user}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <ThemedText>No hay mensajes</ThemedText>
                </View>
              )}
            </>
          )}

          {/* Profile Modal - moved outside conditional rendering */}
          {selectedProfile && (
            <StyledModal
              isModalVisible={isProfileModalVisible}
              setIsModalVisible={setIsProfileModalVisible}
              includeButton={!userFlagVisible}
              topRightElement={(userFlagVisible || selectedProfile.userName == userProfile?.userName) ? undefined : {
                icon: "flag",
                onPress: flagPress,
              }}
            >
              {userFlagVisible ? (
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
                <ScrollView style={styles.modalContent}>
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
                      <ThemedText style={{ marginRight: 10 }} type="title">
                        {selectedProfile.name}
                      </ThemedText>
                    )}
                    <ThemedText style={{ color: 'gray' }}>@{selectedProfile.userName}</ThemedText>
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
                </ScrollView>
              )}
            </StyledModal>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  title: {
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryList: {
    flex: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  unreadSummary: {
    backgroundColor: '#1A1A1A',
  },
  pfpContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  pfp: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryUsername: {
    fontSize: 15,
  },
  summaryTime: {
    fontSize: 12,
    color: '#666',
  },
  summaryMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    fontSize: 24,
    marginRight: 16,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    flexDirection: 'column',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  outgoingMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  incomingMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
  },
  messageText: {
    margin: 0,
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: 'white',
    backgroundColor: '#1A1A1A',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readStatus: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  messageInfo: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  chatProfilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileHeaderText: {
    flex: 1,
  },
  loadingMoreContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
});