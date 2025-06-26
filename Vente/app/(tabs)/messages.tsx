import { View, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, PanResponder, Animated, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../api";
import { useEffect, useRef, useState } from "react";
import { Message, Profile, Exit, GroupMessage, MessageType, GroupMessageSummary, MessageContentType } from "../../api";
import { timeShortDisplay } from "../../dateDisplay";
import { ThemedText } from "@/components/ThemedText";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import React from "react";
import { Feather, FontAwesome } from '@expo/vector-icons';
import FastImage from "react-native-fast-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyledModal } from "@/components/StyledModal";
import { Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Add these helper functions before the Messages component
const getDateSeparator = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoy";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  } else {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.toDateString() === date2.toDateString();
};

export default function Messages() {
  const { selectedUser, selectedExitId } = useLocalSearchParams<{ selectedUser?: string, selectedExitId?: string }>();
  const { api, messageSummaries, allMessages, userProfile, groupMessages, groupMessageSummaries, exits } = useApi();
  const router = useRouter();

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);
  const [selectedExit, setSelectedExit] = useState<Exit | null>(null);

  // Modal state management - single modal with different views
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const loadingMore = useRef(false);

  const MAX_ONELINE_CHARS = 28; // heuristic: adjust as needed
  const [scrollOffset, setScrollOffset] = useState(0);
  const SCROLL_THRESHOLD = 30; // pixels to scroll before dismissing keyboard

  useEffect(() => {
    setLoading(true);
    api.getMessageSummaries();
    api.getGroupMessageSummaries();
    setLoading(false);
  }, []);

  useEffect(() => {
    api.setOpenedDm(selectedUser || null);
  }, [selectedUser]);

  useEffect(() => {
    const exitId = selectedExitId ? parseInt(selectedExitId) : null;
    api.setOpenedGroup(exitId);
    if (exitId) {
      const exit = exits?.find(e => e.id === exitId);
      if (exit) {
        setSelectedExit(exit);
      }
    }
  }, [selectedExitId, exits]);

  useEffect(() => {
    if (selectedUser) {
      if (!allMessages?.[selectedUser]) {
        api.getUserMessages(selectedUser, null);
      }

      api.markRead(selectedUser);
      api.getMessageSummaries();
    }
  }, [selectedUser, allMessages]);

  useEffect(() => {
    if (selectedExitId) {
      if (!groupMessages?.[parseInt(selectedExitId)]) {
        api.getGroupMessages(parseInt(selectedExitId), null);
      }

      api.markGroupMessageRead(parseInt(selectedExitId));
      api.getGroupMessageSummaries();
    }
  }, [selectedExitId, groupMessages]);

  useEffect(() => {
    // Fetch profile info and pfp for each user in messageSummaries (by username)
    if (messageSummaries) {
      for (const summary of messageSummaries) {
        api.getUser(summary.user);
        api.fetchPfp(summary.user);
      }
    }
  }, [messageSummaries]);

  // Add new useEffect for group message readBy users
  useEffect(() => {
    if (selectedExitId && groupMessages?.[parseInt(selectedExitId)]) {
      const messages = groupMessages[parseInt(selectedExitId)];
      const allReaders = new Set<string>();
      messages.forEach(message => {
        if (message.readBy) {
          message.readBy.forEach(reader => allReaders.add(reader));
        }
      });
      allReaders.forEach(reader => {
        api.getUser(reader);
        api.fetchPfp(reader);
      });
    }
  }, [selectedExitId, groupMessages]);

  const handleProfileClick = (username: string) => {
    const profile = api.getUserCached(username) as Profile;
    if (profile) {
      setSelectedProfile(profile);
      setIsProfileModalVisible(true);
    }
  };

  const handleGroupMemberClick = (username: string) => {
    const profile = api.getUserCached(username) as Profile;
    if (profile) {
      setShowGroupInfo(false);
      setIsProfileModalVisible(true);
      setSelectedProfile(profile);
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
      if (lastMessage && !lastMessage.waitingForAck) {
        await api.getUserMessages(selectedUser, lastMessage.id as number);
      }
    } else if (selectedExitId) {
      const exitId = parseInt(selectedExitId);
      const lastMessage = groupMessages?.[exitId]?.[groupMessages?.[exitId]?.length - 1];
      if (lastMessage && !lastMessage.waitingForAck) {
        await api.getGroupMessages(exitId, lastMessage.id as number);
      }
    }
    loadingMore.current = false;
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");

    if (selectedUser) {
      await api.sendMessage(selectedUser, messageToSend);
      // Don't fetch messages again after sending, as the real-time connection will handle updates
      await api.getMessageSummaries();
    } else if (selectedExitId) {
      const exitId = parseInt(selectedExitId);
      await api.sendGroupMessage(exitId, messageToSend);
      // Don't fetch messages again after sending, as the real-time connection will handle updates
      await api.getGroupMessageSummaries();
    }
  };

  const renderMessage = ({ item, index }: { item: Message | GroupMessage, index: number }) => {
    const isGroupMessage = 'senderUsername' in item;
    const isOutgoing = isGroupMessage
      ? (item as GroupMessage).senderUsername === userProfile?.userName
      : (item as Message).type === "Outgoing";
    const isLastMessage = (
      isGroupMessage
        ? groupMessages?.[parseInt(selectedExitId!)]?.[0]?.id === item.id
        : isOutgoing && allMessages?.[selectedUser!]?.[0]?.id === item.id
    );
    const timeStr = timeShortDisplay(new Date(item.timestamp));
    const textContent = item.textContent || "";
    const oneLine = (textContent.length + timeStr.length + 2) <= MAX_ONELINE_CHARS;

    // Check if previous message was from the same sender
    const prevMessage = isGroupMessage
      ? groupMessages?.[parseInt(selectedExitId!)]?.[index + 1]
      : allMessages?.[selectedUser!]?.[index + 1];
    const isSameSender = prevMessage && (
      isGroupMessage
        ? (prevMessage as GroupMessage).senderUsername === (item as GroupMessage).senderUsername
        : (prevMessage as Message).type === (item as Message).type
    );
    const messageSpacing = isSameSender ? -1 : 8;

    // Check if we need to show a date separator
    const showDateSeparator = !prevMessage || !isSameDay(new Date(item.timestamp), new Date(prevMessage.timestamp));

    return (
      <View style={{ flexDirection: 'column', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', gap: 0, marginTop: messageSpacing }}>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <ThemedText style={styles.dateSeparatorText}>
              {getDateSeparator(new Date(item.timestamp))}
            </ThemedText>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOutgoing ? styles.outgoingMessage : styles.incomingMessage,
          { alignSelf: isOutgoing ? 'flex-end' : 'flex-start' }
        ]}>
          {!isOutgoing && isGroupMessage && (
            <ThemedText style={styles.senderName}>{item.senderUsername}</ThemedText>
          )}
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
        {isLastMessage && (
          <>
            {isGroupMessage ? (
              <View style={[styles.readByContainer, { alignSelf: isOutgoing ? 'flex-end' : 'flex-start' }]}>
                {Array.from(new Set((item as GroupMessage).readBy))
                  .filter(reader => reader !== userProfile?.userName)
                  .map((reader: string, i: number) => (
                    <FastImage
                      key={reader}
                      source={{ uri: api.getPfpFromCache(reader) }}
                      style={[styles.readByPfp, { marginLeft: i > 0 ? -8 : 0 }]}
                    />
                  ))}
              </View>
            ) : (
              (item as Message).read && <ThemedText style={styles.readStatus}>Visto</ThemedText>
            )}
          </>
        )}
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

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const diff = currentOffset - scrollOffset;

    // Since the list is inverted, we check for positive diff (scrolling down)
    if (diff > SCROLL_THRESHOLD) {
      Keyboard.dismiss();
    }
    setScrollOffset(currentOffset);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black', marginBottom: 10 }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          {selectedUser || selectedExitId ? (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                  router.push('/messages');
                }}>
                  <ThemedText style={styles.backButton}>←</ThemedText>
                </TouchableOpacity>
                {selectedUser ? (
                  <TouchableOpacity
                    style={styles.profileHeader}
                    onPress={() => handleProfileClick(selectedUser)}
                  >
                    <FastImage source={{ uri: api.getPfpFromCache(selectedUser) }} style={styles.chatProfilePicture} />
                    <View style={styles.profileHeaderText}>
                      <ThemedText type="defaultSemiBold">{api.getUserCached(selectedUser)?.name || `@${selectedUser}`}</ThemedText>
                      {api.getUserCached(selectedUser)?.verified && (
                        <View style={{ backgroundColor: '#1DA1F2', borderRadius: 10, padding: 2, marginLeft: 4 }}>
                          <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                      )}
                    </View>
                    <Feather name="chevron-right" size={24} color="white" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.profileHeader}
                    onPress={() => {
                      setShowGroupInfo(true)
                    }}
                  >
                    <View style={styles.profileHeaderText}>
                      <ThemedText type="defaultSemiBold">{selectedExit?.name || 'Grupo'}</ThemedText>
                    </View>
                    <Feather name="chevron-right" size={24} color="white" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={selectedUser ? allMessages?.[selectedUser] : groupMessages?.[parseInt(selectedExitId!)]}
                onEndReached={endReached}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()}
                inverted
                style={styles.messagesList}
                ListFooterComponent={ListFooterComponent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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
              {(messageSummaries && messageSummaries.length > 0) || (exits && exits.length > 0) ? (
                <FlatList
                  data={[
                    ...(messageSummaries || []),
                    ...(groupMessageSummaries || []).map((summary: GroupMessageSummary) => ({
                      id: summary.exitId,
                      user: summary.groupName,
                      read: false,
                      type: "Incoming" as MessageType,
                      messageType: summary.messageType,
                      textContent: summary.textContent,
                      timestamp: summary.timestamp,
                      isGroup: true,
                      exitId: summary.exitId
                    })),
                    // Add active groups that don't have messages yet
                    ...(exits || [])
                      .filter(exit =>
                        exit.members &&
                        exit.members.length > 0 &&
                        !groupMessageSummaries?.some(summary => summary.exitId === exit.id)
                      )
                      .map(exit => ({
                        id: `group_${exit.id}`,
                        user: exit.name,
                        read: false,
                        type: "Incoming" as MessageType,
                        messageType: "Text" as MessageContentType,
                        textContent: "No hay mensajes aún",
                        timestamp: new Date(exit.dates[0]), // Use the first date as timestamp for sorting
                        isGroup: true,
                        exitId: exit.id
                      }))
                  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
                  renderItem={({ item }) => {
                    const isGroup = 'isGroup' in item;
                    if (isGroup) {
                      return (
                        <TouchableOpacity
                          style={styles.messageItem}
                          onPress={() => {
                            router.push(`/messages?selectedExitId=${item.exitId}`);
                          }}
                        >
                          <View style={styles.profileContainer}>
                            <View style={styles.messageInfo}>
                              <View style={styles.nameContainer}>
                                <ThemedText type="subtitle">{item.user}</ThemedText>
                              </View>
                              <ThemedText style={styles.messagePreview}>
                                {item.textContent && item.textContent.length > MAX_ONELINE_CHARS
                                  ? item.textContent.substring(0, MAX_ONELINE_CHARS) + '...'
                                  : item.textContent}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.messageTime}>
                              {timeShortDisplay(item.timestamp)}
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    const profile = api.getUserCached(item.user) as Profile;
                    const pfpUrl = api.getPfpFromCache(item.user);
                    const displayName = profile?.name || `@${item.user}`;
                    const unread = item.read === false && item.type === "Incoming";

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
                            <View style={styles.nameContainer}>
                              <ThemedText type="subtitle" style={unread && styles.unreadText}>{displayName}</ThemedText>
                              {unread && <View style={styles.unreadDot} />}
                            </View>
                            <ThemedText style={[styles.messagePreview, unread && styles.unreadText]}>
                              {item.textContent && item.textContent.length > MAX_ONELINE_CHARS
                                ? item.textContent.substring(0, MAX_ONELINE_CHARS) + '...'
                                : item.textContent}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.messageTime, !item.read && styles.unreadText]}>
                            {timeShortDisplay(item.timestamp)}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={(item) => item.id.toString()}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <ThemedText>No hay mensajes</ThemedText>
                </View>
              )}
            </>
          )}

          {/* Single Modal with Conditional Content */}
          <StyledModal
            isModalVisible={isProfileModalVisible || showGroupInfo}
            setIsModalVisible={(visible) => {
              setIsProfileModalVisible(visible);
              setShowGroupInfo(false);
              if (!visible) {
                setSelectedProfile(null);
                setUserFlagVisible(false);
              }
            }}
            includeButton={!userFlagVisible}
            topRightElement={
              selectedProfile && !userFlagVisible && !showGroupInfo && selectedProfile.userName !== userProfile?.userName ? {
                icon: "flag",
                onPress: flagPress,
              } : undefined
            }
          >
            {showGroupInfo && selectedExit ? (
              <ScrollView style={styles.modalContent}>
                <ThemedText type="title" style={{ marginBottom: 20 }}>
                  {selectedExit.name}
                </ThemedText>

                <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                  Miembros ({(selectedExit.members?.length || 0) + 1})
                </ThemedText>

                {/* Leader */}
                <TouchableOpacity
                  style={styles.memberCard}
                  onPress={() => handleGroupMemberClick(selectedExit.leader)}
                >
                  <FastImage
                    source={{ uri: api.getPfpFromCache(selectedExit.leader) }}
                    style={styles.memberProfilePicture}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameContainer}>
                      <ThemedText type="subtitle">@{selectedExit.leader}</ThemedText>
                      <View style={styles.leaderBadge}>
                        <ThemedText style={styles.leaderBadgeText}>Líder</ThemedText>
                      </View>
                    </View>
                    {api.getUserCached(selectedExit.leader)?.name && (
                      <ThemedText style={styles.memberRealName}>
                        {api.getUserCached(selectedExit.leader)?.name}
                      </ThemedText>
                    )}
                  </View>
                  <Feather name="chevron-right" size={20} color="white" />
                </TouchableOpacity>

                {/* Members */}
                {selectedExit.members?.map((member: string) => (
                  <TouchableOpacity
                    key={member}
                    style={styles.memberCard}
                    onPress={() => handleGroupMemberClick(member)}
                  >
                    <FastImage
                      source={{ uri: api.getPfpFromCache(member) }}
                      style={styles.memberProfilePicture}
                    />
                    <View style={styles.memberInfo}>
                      <ThemedText type="subtitle">@{member}</ThemedText>
                      {api.getUserCached(member)?.name && (
                        <ThemedText style={styles.memberRealName}>
                          {api.getUserCached(member)?.name}
                        </ThemedText>
                      )}
                    </View>
                    <Feather name="chevron-right" size={20} color="white" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : selectedProfile ? (
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
                </ScrollView>
              )
            ) : null}
          </StyledModal>
        </View>
      </SafeAreaView >
    </KeyboardAvoidingView >
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
    backgroundColor: '#0095F6',
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
  messagePreview: {
    color: 'gray',
  },
  unreadText: {
    color: 'white',
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: "center",
    flex: 1,
  },
  loadingMoreContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  readByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  readByPfp: {
    width: 18,
    height: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'black',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  memberProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberRealName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  leaderBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  leaderBadgeText: {
    fontSize: 12,
    color: 'black',
    fontWeight: '600',
  },
});