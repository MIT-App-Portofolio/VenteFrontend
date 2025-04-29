import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../api";
import { useEffect, useState } from "react";
import { Notification, Profile } from "../../api";
import { ThemedText } from "@/components/ThemedText";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import React from "react";
import { Feather, FontAwesome } from '@expo/vector-icons';
import FastImage from "react-native-fast-image";
import { router } from "expo-router";
import { StyledModal } from "@/components/StyledModal";
import { Linking } from 'react-native';

export default function Notifications() {
  const { api, notifications, userProfile } = useApi();
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [userFlagVisible, setUserFlagVisible] = useState(false);
  const [userFlagLoading, setUserFlagLoading] = useState(false);
  const [userFlagMessage, setUserFlagMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch profile info and pfp for each user referenced in notifications
    if (notifications) {
      for (const notification of notifications) {
        if (notification.referenceUsername) {
          api.getUser(notification.referenceUsername);
          api.fetchPfp(notification.referenceUsername);
        }
      }
    }
  }, [notifications]);

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

  const renderNotification = ({ item, index }: { item: Notification, index: number }) => {
    const hasReferenceUser = item.referenceUsername !== undefined;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadNotification]}
        onPress={() => {
          if (hasReferenceUser) {
            handleProfileClick(item.referenceUsername!);
          }
        }}
      >
        <View style={styles.notificationContent}>
          <ThemedText style={styles.notificationText}>{item.message}</ThemedText>
        </View>
        {hasReferenceUser && (
          <View style={styles.referenceUserContainer}>
            <FastImage
              source={{ uri: api.getPfpFromCache(item.referenceUsername!) }}
              style={styles.referenceUserPfp}
            />
            <Feather name="chevron-right" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <ThemedText style={styles.backButton}>←</ThemedText>
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={{ flex: 1, textAlign: 'center', fontSize: 20 }}>
            Notificaciones
          </ThemedText>
          <View style={{ width: 24 }} /> {/* Spacer to balance the header */}
        </View>

        {notifications && notifications.length > 0 ? (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            contentContainerStyle={{ marginBottom: 20 }}
            keyExtractor={(_, index) => index.toString()}
            onEndReached={() => {
              // Mark all notifications as read when reaching the end
              api.markNotificationsAsRead();
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText>No hay notificaciones</ThemedText>
          </View>
        )}

        {/* Profile Modal */}
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

                <BtnPrimary
                  title='Mensaje'
                  onClick={() => {
                    router.push(`/messages?selectedUser=${selectedProfile.userName}`);
                    setSelectedProfile(null);
                  }}
                />
              </View>
            )}
          </StyledModal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  notificationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadNotification: {
    backgroundColor: '#1A1A1A',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    marginBottom: 4,
  },
  referenceUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  referenceUserPfp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
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
}); 