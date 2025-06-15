import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenLoading } from './components/FullScreenLoading';
import { Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import * as signalR from '@microsoft/signalr';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Notifications from 'expo-notifications';

export enum AuthResult {
  UnknownError,
  Authenticated,
  Unauthenticated
}

export type InviteStatus = {
  invited: boolean,
  invitors: Profile[] | null,
}

export type GroupStatus = {
  members: string[],
  awaitingInvite: string[],
}

export type Profile = {
  userName: string,
  gender: number,
  note?: string,
  years?: number,
  name?: string,
  igHandle?: string,
  description?: string,
  verified: boolean,
};

export type Exit = {
  id: number,
  locationId: string,
  name: string,
  leader: string,
  dates: Date[]
  members?: string[],
  awaitingInvite?: string[],
};

export type ExitUserQuery = {
  userName: string,
  gender: number,
  dates: Date[],
  with: ExitUserFriendQuery[],
  note?: string,
  years?: number,
  name?: string,
  igHandle?: string,
  description?: string,
  exitId: number,
  likes: number,
  userLiked: boolean,
  verified: boolean,
};

export type ExitUserFriendQuery = {
  displayName: string,
  pfpUrl: string,
};

export type EventLocation = {
  id: string,
  name: string,
  pictureUrl: string,
  latitude: number,
  longitude: number,
};

export type EventPlace = {
  // Could be "Bar" or "Disco" for now, but depends on backend, so no hard-coding and important to prevent crashes for unknown values.
  type: string;
  name: string,
  description?: string,
  imageUrls: string[],
  priceRangeBegin?: number,
  priceRangeEnd?: number,
  ageRequirement?: number,
  googleMapsLink?: string,
  events: EventPlaceEvent[]
}

export type EventPlaceEvent = {
  name: string,
  description: string,
  image?: string,
  time: Date,
  offers: EventPlaceOffer[],
  purchaseLink?: string,
}

export type EventPlaceOffer = {
  name: string,
  description?: string,
  price?: number,
}

export type CustomOffer = {
  id: number;
  name: string,
  description?: string,
  place: EventPlace,
  imageUrl?: string,
  validUntil: Date
}

export type AlbumPicture = {
  id: number;
  uploader: string;
  time: Date;
}

export type SharedAlbum = {
  id: number;
  locationId: string;
  eventTime: Date;
  pictures: AlbumPicture[];
}

export type OwnPictures = {
  albumId: number;
  pictures: AlbumPicture[];
}

export type SearchUser = {
  username: string,
  pfpUrl: string,
}

export type FriendStatus = {
  username: string,
  name: string,
  pfpUrl: string,
  dates: Date[],
  locationId: string,
}

export type CurrentNews = {
  name: string,
  description: string,
  uniqueId: string,
  path?: string,
}

export type MessageType = "Incoming" | "Outgoing";
export type MessageContentType = "Text" | "Voice";

export type Message = {
  // Server sent
  id: number | string,
  user: string,
  read: boolean,
  type: MessageType,
  messageType: MessageContentType,
  textContent?: string,
  timestamp: Date,
  // Client side only
  waitingForAck?: boolean,
};

export type GroupMessage = {
  id: number | string,
  senderUsername: string,
  messageType: MessageContentType,
  textContent?: string,
  readBy: string[],
  timestamp: Date,
  waitingForAck?: boolean,
};

export type GroupMessageSummary = {
  groupName: string,
  exitId: number,
  senderUsername: string,
  messageType: MessageContentType,
  textContent?: string,
  timestamp: Date,
};

export type Notification = {
  type: string;
  read: boolean;
  message: string;
  timestamp: Date;
  referenceUsername?: string;
};

type ApiError = {
  response?: {
    status: number;
    data: any;
  };
};

type RegisterError = {
  code: string;
};

const ApiContext = createContext<{
  api: Api,
  userProfile: Profile | null,
  userPfp: string | null,
  hasPfp: boolean,
  exits: Exit[] | null
  invitedExits: Exit[] | null
  customOffers: CustomOffer[] | null
  ownPictures: OwnPictures | null
  sharedAlbums: SharedAlbum[] | null
  messageSummaries: Message[] | null
  allMessages: { [key: string]: Message[] } | null
  currentAlbumId: number | null
  exitAlbumAvailable: boolean
  notifications: Notification[] | null
  outgoingSolicitations: SearchUser[] | null
  incomingSolicitations: SearchUser[] | null
  friends: SearchUser[] | null
  statuses: FriendStatus[] | null
  groupMessageSummaries: GroupMessageSummary[] | null
  groupMessages: { [key: string]: GroupMessage[] } | null
} | null>(null);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [api, setApiInstance] = useState<Api | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userPfp, setUserPfp] = useState<string | null>(null);
  const [customOffers, setCustomOffers] = useState<CustomOffer[] | null>(null);
  const [ownPictures, setOwnPictures] = useState<OwnPictures | null>(null);
  const [sharedAlbums, setSharedAlbums] = useState<SharedAlbum[] | null>(null);
  const [currentAlbumId, setCurrentAlbumId] = useState<number | null>(null);
  const [exits, setExits] = useState<Exit[] | null>(null);
  const [invitedExits, setInvitedExits] = useState<Exit[] | null>(null);
  const [exitAlbumAvailable, setExitAlbumAvailable] = useState<boolean>(false);
  const [messageSummaries, setMessageSummaries] = useState<Message[] | null>(null);
  const [allMessages, setAllMessages] = useState<{ [key: string]: Message[] } | null>(null);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [outgoingSolicitations, setOutgoingSolicitations] = useState<SearchUser[] | null>(null);
  const [incomingSolicitations, setIncomingSolicitations] = useState<SearchUser[] | null>(null);
  const [friends, setFriends] = useState<SearchUser[] | null>(null);
  const [statuses, setStatuses] = useState<FriendStatus[] | null>(null);
  const [hasPfp, setHasPfp] = useState<boolean>(false);
  const [groupMessageSummaries, setGroupMessageSummaries] = useState<GroupMessageSummary[] | null>(null);
  const [groupMessages, setGroupMessages] = useState<{ [key: string]: GroupMessage[] } | null>(null);
  useEffect(() => {
    const initializeApi = async () => {
      const instance = new Api(
        setUserProfile,
        setUserPfp,
        setCustomOffers,
        setOwnPictures,
        setSharedAlbums,
        setCurrentAlbumId,
        setExits,
        setInvitedExits,
        setExitAlbumAvailable,
        setMessageSummaries,
        setAllMessages,
        setNotifications,
        setOutgoingSolicitations,
        setIncomingSolicitations,
        setFriends,
        setStatuses,
        setHasPfp,
        setGroupMessageSummaries,
        setGroupMessages
      );
      var url = "";

      if (__DEV__) {
        if (Platform.OS === 'android') {
          url = 'http://10.0.2.2:5192';
        } else {
          url = 'http://localhost:5192';
        }

        try {
          await axios.get(url + '/online');
          console.log('Using local api.');
        } catch {
          console.log('Could not communicate with local api falling to production.');
          url = 'https://venteapp.es';
        }
      } else {
        url = 'https://venteapp.es';
      }

      await instance.init(url);

      setApiInstance(instance);
    };

    initializeApi();
  }, []);

  if (!api) {
    return <FullScreenLoading></FullScreenLoading>;
  }

  return (
    <ApiContext.Provider value={{
      api,
      userProfile,
      userPfp,
      customOffers,
      ownPictures,
      sharedAlbums,
      currentAlbumId,
      messageSummaries,
      allMessages,
      exits,
      invitedExits,
      exitAlbumAvailable,
      notifications,
      outgoingSolicitations,
      incomingSolicitations,
      friends,
      statuses,
      hasPfp,
      groupMessageSummaries,
      groupMessages
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export class Api {
  public locations: EventLocation[] | null;

  private axios: AxiosInstance | null;
  private messageConnection: signalR.HubConnection | null;

  private usersQueryDb: { [key: string]: ExitUserQuery } = {};
  private accountAccessDb: { [key: string]: Profile } = {};
  private pfpDb: { [key: string]: string } = {};
  private username: string | null;
  private connectingToMessaging: boolean = false;

  public openedDm: string | null;
  public openedGroup: number | null;

  private setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  private setUserPfp: React.Dispatch<React.SetStateAction<string | null>>;
  private setCustomOffers: React.Dispatch<React.SetStateAction<CustomOffer[] | null>>;
  private setOwnPictures: React.Dispatch<React.SetStateAction<OwnPictures | null>>;
  private setSharedAlbums: React.Dispatch<React.SetStateAction<SharedAlbum[] | null>>;
  private setCurrentAlbumId: React.Dispatch<React.SetStateAction<number | null>>;
  private setExits: React.Dispatch<React.SetStateAction<Exit[] | null>>;
  private setInvitedExits: React.Dispatch<React.SetStateAction<Exit[] | null>>;
  private setExitAlbumAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  private setMessageSummaries: React.Dispatch<React.SetStateAction<Message[] | null>>;
  private setAllMessages: React.Dispatch<React.SetStateAction<{ [key: string]: Message[] } | null>>;
  private setNotifications: React.Dispatch<React.SetStateAction<Notification[] | null>>;
  private setOutgoingSolicitations: React.Dispatch<React.SetStateAction<SearchUser[] | null>>;
  private setIncomingSolicitations: React.Dispatch<React.SetStateAction<SearchUser[] | null>>;
  private setFriends: React.Dispatch<React.SetStateAction<SearchUser[] | null>>;
  private setStatuses: React.Dispatch<React.SetStateAction<FriendStatus[] | null>>;
  private setHasPfp: React.Dispatch<React.SetStateAction<boolean>>;
  private setGroupMessageSummaries: React.Dispatch<React.SetStateAction<GroupMessageSummary[] | null>>;
  private setGroupMessages: React.Dispatch<React.SetStateAction<{ [key: number]: GroupMessage[] } | null>>;

  constructor(
    setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
    setUserPfp: React.Dispatch<React.SetStateAction<string | null>>,
    setCustomOffers: React.Dispatch<React.SetStateAction<CustomOffer[] | null>>,
    setOwnPictures: React.Dispatch<React.SetStateAction<OwnPictures | null>>,
    setSharedAlbums: React.Dispatch<React.SetStateAction<SharedAlbum[] | null>>,
    setCurrentAlbumId: React.Dispatch<React.SetStateAction<number | null>>,
    setExits: React.Dispatch<React.SetStateAction<Exit[] | null>>,
    setInvitedExits: React.Dispatch<React.SetStateAction<Exit[] | null>>,
    setExitAlbumAvailable: React.Dispatch<React.SetStateAction<boolean>>,
    setMessageSummaries: React.Dispatch<React.SetStateAction<Message[] | null>>,
    setAllMessages: React.Dispatch<React.SetStateAction<{ [key: string]: Message[] } | null>>,
    setNotifications: React.Dispatch<React.SetStateAction<Notification[] | null>>,
    setOutgoingSolicitations: React.Dispatch<React.SetStateAction<SearchUser[] | null>>,
    setIncomingSolicitations: React.Dispatch<React.SetStateAction<SearchUser[] | null>>,
    setFriends: React.Dispatch<React.SetStateAction<SearchUser[] | null>>,
    setStatuses: React.Dispatch<React.SetStateAction<FriendStatus[] | null>>,
    setHasPfp: React.Dispatch<React.SetStateAction<boolean>>,
    setGroupMessageSummaries: React.Dispatch<React.SetStateAction<GroupMessageSummary[] | null>>,
    setGroupMessages: React.Dispatch<React.SetStateAction<{ [key: number]: GroupMessage[] } | null>>
  ) {
    this.locations = null;
    this.axios = null;
    this.messageConnection = null;
    this.openedDm = null;
    this.openedGroup = null;
    this.username = null;
    this.setUserProfile = setUserProfile;
    this.setUserPfp = setUserPfp;
    this.setCustomOffers = setCustomOffers;
    this.setOwnPictures = setOwnPictures;
    this.setSharedAlbums = setSharedAlbums;
    this.setCurrentAlbumId = setCurrentAlbumId;
    this.setExits = setExits;
    this.setInvitedExits = setInvitedExits;
    this.setExitAlbumAvailable = setExitAlbumAvailable;
    this.setMessageSummaries = setMessageSummaries;
    this.setAllMessages = setAllMessages;
    this.setNotifications = setNotifications;
    this.setOutgoingSolicitations = setOutgoingSolicitations;
    this.setIncomingSolicitations = setIncomingSolicitations;
    this.setFriends = setFriends;
    this.setStatuses = setStatuses;
    this.setHasPfp = setHasPfp;
    this.setGroupMessageSummaries = setGroupMessageSummaries;
    this.setGroupMessages = setGroupMessages;
  }

  public async init(url: string) {
    this.axios = await this.axios_instance(url);

    // Check if we have an auth token and initialize messaging if we do
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      await this.initializeMessagingConnection(url);
    }
  }

  private async initializeMessagingConnection(url: string) {
    if (this.messageConnection) {
      await this.messageConnection.stop();
    }

    this.connectingToMessaging = true;

    const token = await AsyncStorage.getItem('authToken');

    this.messageConnection = new signalR.HubConnectionBuilder()
      .withUrl(url + "/chathub?access_token=" + token)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .build();

    this.messageConnection.onclose(async (error) => {
      console.log('Connection closed:', error);
      if (error) {
        await this.reconnectMessaging();
      }
    });

    this.messageConnection.on("ReceiveMessage", (message: Message) => {
      console.log("ReceiveMessage", message);
      this.setAllMessages(messages => ({
        ...messages,
        [message.user]: [message, ...(messages?.[message.user] || [])]
      }));

      if (this.openedDm === message.user) {
        console.log("Marking message as read");
        this.messageConnection?.invoke("MarkRead", message.user);
      } else {
        console.log("Sending notification for message", message);
        let body = message.textContent;
        if (message.messageType === "Voice") {
          body = "Mensaje de voz";
        } else if (message.textContent === null) {
          body = "Mensaje desconocido";
        }

        Notifications.scheduleNotificationAsync({
          content: {
            title: message.user + " te ha enviado un mensaje",
            body: body,
            data: {
              notification_type: "message",
              from_user: message.user,
              link: "/messages?selectedUser=" + message.user
            }
          },
          trigger: null
        });
      }

      this.getMessageSummaries();
    });

    this.messageConnection.on("MessageRead", (user: string) => {
      this.setAllMessages(messages => {
        if (!messages) return null;
        return {
          ...messages,
          [user]: messages[user]?.map(m => ({ ...m, read: true })) || []
        };
      });

      this.getMessageSummaries();
    });

    this.messageConnection.on("MessageAck", (withUser: string, tempId: string, id: string) => {
      this.setAllMessages(messages => {
        if (!messages) return null;
        if (!messages[withUser]) return messages;

        return {
          ...messages,
          [withUser]: messages[withUser].map(m =>
            m.id === tempId ? { ...m, id, waitingForAck: false } : m
          )
        };
      });
    });

    this.messageConnection.on("ReceiveGroupMessage", (exitId: number, message: GroupMessage) => {
      this.setGroupMessages(messages => ({
        ...messages,
        [exitId]: [message, ...(messages?.[exitId] || [])]
      }));

      if (this.openedGroup === exitId) {
        console.log("Marking group message as read");
        this.messageConnection?.invoke("MarkGroupRead", exitId);
      } else {
        console.log("Sending notification for group message", message);

        let body = message.textContent;
        if (message.messageType === "Voice") {
          body = "Mensaje de voz";
        } else if (message.textContent === null) {
          body = "Mensaje desconocido";
        }

        Notifications.scheduleNotificationAsync({
          content: {
            title: message.senderUsername + " te ha enviado un mensaje",
            body: body,
            data: {
              notification_type: "group_message",
              from_user: message.senderUsername,
              link: "/messages?selectedExitId=" + exitId
            }
          },
          trigger: null
        });
      }

      this.getGroupMessageSummaries();
    });

    this.messageConnection.on("GroupMessageRead", (exitId: number, reader: string) => {
      console.log("GroupMessageRead", exitId, reader);

      this.setGroupMessages(messages => {
        if (!messages) return null;
        return {
          ...messages,
          [exitId]: messages[exitId]?.map(m => ({ ...m, readBy: [...m.readBy, reader] })) || []
        };
      });

      this.getGroupMessageSummaries();
    });

    this.messageConnection.on("GroupMessageAck", (exitId: number, tempId: string, id: string) => {
      this.setGroupMessages(messages => {
        if (!messages) return null;
        return {
          ...messages,
          [exitId]: messages[exitId]?.map(m => m.id === tempId ? { ...m, id, waitingForAck: false } : m) || []
        };
      });
    });

    try {
      await this.messageConnection.start();
    } catch (e) {
      console.log('Failed to start messaging connection:', e);
    }

    this.connectingToMessaging = false;
  }

  private async reconnectMessaging() {
    try {
      const url = this.axios?.defaults.baseURL;
      if (url) {
        await this.initializeMessagingConnection(url);
      }
    } catch (e) {
      console.log('Failed to reconnect messaging:', e);
    }
  }

  public async checkAndInitializeMessaging() {
    if (this.connectingToMessaging) {
      return;
    }

    const token = await AsyncStorage.getItem('authToken');
    if (token) {

      const url = this.axios?.defaults.baseURL;
      if (url) {
        if (this.messageConnection && this.messageConnection.state !== signalR.HubConnectionState.Connected) {
          await this.reconnectMessaging();
        } else if (!this.messageConnection) {
          await this.initializeMessagingConnection(url);
        }
      }
    }
  }

  public async stopMessagingConnection() {
    if (this.messageConnection) {
      try {
        await this.messageConnection.stop();
        this.messageConnection = null;
      } catch (e) {
        console.log('Failed to stop messaging connection:', e);
      }
    }
  }

  public hasUser(username: string) {
    return this.accountAccessDb[username] !== undefined || this.usersQueryDb[username] !== undefined;
  }

  public async getUser(username: string) {
    // query db overlaps with account access db, with extra info so it's safer to access from here.
    if (this.usersQueryDb[username]) {
      return this.usersQueryDb[username];
    }

    if (this.accountAccessDb[username]) {
      return this.accountAccessDb[username];
    }

    try {
      const response = await this.axios!.get('/api/account/profile?username=' + username);
      const profile: Profile = response.data;
      this.accountAccessDb[username] = profile;
      return profile;
    } catch {
      return null;
    }
  }

  public getLocationName(locationId: string): string | undefined {
    return this.locations?.find(l => l.id == locationId)?.name;
  }

  // Assumes user is already in the db
  public getUserCached(username: string): Profile | ExitUserQuery {
    if (this.usersQueryDb[username]) {
      return this.usersQueryDb[username];
    }

    return this.accountAccessDb[username];
  }

  public async isAffiliate() {
    return (await this.axios?.get('/api/venue/is_affiliate'))!.data === true;
  }

  //#region Authentication

  public async getUserInfo() {
    try {
      const response = await this.axios!.get('/api/account/info');
      const profile = {
        ...response.data,
        eventStatus: {
          ...response.data.eventStatus,
          time: response.data.eventStatus.time ? new Date(response.data.eventStatus.time) : null,
        },
      };

      this.username = profile.userName;
      this.setUserProfile(profile);

      await this.fetchUserPfp();

      return AuthResult.Authenticated;
    } catch (error) {
      console.log('user info: ' + error);
      const e = error as ApiError;
      if (e.response && e.response.status === 401) {
        return AuthResult.Unauthenticated;
      }
    }
    return AuthResult.UnknownError;
  }

  public async getHasPfp() {
    try {
      const response = await this.axios!.get('/api/account/has_pfp');
      this.setHasPfp(response.data);
    } catch (e) {
      console.log('get has pfp: ' + e);
    }
  }

  public async fetchUserPfp() {
    try {
      const response = await this.axios!.get('/api/access_pfp?userName=' + this.username);
      const imageUrl = response.data;

      this.pfpDb[this.username!] = imageUrl;

      this.setUserPfp(imageUrl);
    } catch (e) {
      console.log('set pfp: ' + e);
      this.setUserPfp(null);
    }
  }

  public async fetchPfp(userName: string) {
    if (this.pfpDb[userName]) {
      return this.pfpDb[userName];
    }

    try {
      const response = await this.axios!.get('/api/access_pfp?userName=' + userName);
      const imageUrl = response.data;
      this.pfpDb[userName] = imageUrl;
      return imageUrl;
    } catch (e) {
      console.log('pfp: ' + e);
      return null;
    }
  }

  public async getCustomOffers() {
    try {
      const response = await this.axios!.get('/api/account/get_offers');
      response.data.forEach((element: CustomOffer) => {
        element.validUntil = new Date(element.validUntil)
      });

      this.setCustomOffers(response.data);

      return true;
    } catch (e) {
      console.log('custom offers info: ' + e);
      return false;
    }
  }

  public async getCustomOfferQrToken(offer: CustomOffer) {
    try {
      return [true, (await this.axios!.get('/api/account/get_offer_qr?offerId=' + offer.id)).data];
    } catch (e) {
      console.log('get custom offer qr: ' + e);
      return [false, null];
    }
  }

  public async getQrTokenInfo(token: string) {
    try {
      const data: CustomOffer = (await this.axios!.get('/api/venue/scan_offer_qr?token=' + token)).data;
      data.validUntil = new Date(data.validUntil);
      return [true, data];
    } catch (e: any) {
      console.log('get qr token info: ' + e);
      if (e.response?.data === "token_not_found") {
        return [false, "El código QR no es válido o ha expirado"];
      } else if (e.response?.data === "unknown_offer") {
        return [false, "La oferta no existe o ha sido eliminada"];
      } else if (e.response?.data === "wrong_venue") {
        return [false, "Esta oferta no es válida para este establecimiento"];
      } else if (e.response?.status === 400) {
        return [false, "Error al escanear el código QR"];
      }
      return [false, "Error al contactar con el servidor"];
    }
  }

  // Assumes pfp is already in db
  public getPfpFromCache(userName: string) {
    return this.pfpDb[userName];
  }

  public async updateProfilePicture(uri: string) {
    const formData = new FormData();

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const file = {
        uri: uri,
        name: 'file',
        type: 'image/jpeg',
      } as unknown as Blob;
      formData.append('file', file);
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], 'file', { type: 'image/jpeg' });
      formData.append('file', file);
    }

    try {
      await this.axios!.post('/api/account/update_pfp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await this.fetchUserPfp();
      await this.getHasPfp();
      return true;
    } catch (e) {
      console.log('update pfp: ' + e);
      return false;
    }
  }

  public async getLocations() {
    try {
      this.locations = (await this.axios!.get('/api/get_locations')).data;
      return true;
    } catch (e) {
      console.log('locations: ' + e);
      return false;
    }
  }

  public async googleShouldRegister(id: string) {
    try {
      var shouldRegister = await this.axios!.get('/api/account/google_should_register?id=' + id);
      console.log('Should register: ' + shouldRegister.data);
      return [true, shouldRegister.data];
    } catch (e) {
      console.log('google should register: ' + e);
      return [false, null];
    }
  }

  public async googleRegister(id: string, userName: string, gender: number, birthDate: Date | null): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/register_google', {
        id,
        gender,
        birthDate,
        userName,
      });

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
      await this.checkAndInitializeMessaging();
    } catch (e) {
      console.log('google register: ' + e);
      return [false, this.translateRegisterError(e)];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async googleLogin(id: string): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/login_google?id=' + id);

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
      await this.checkAndInitializeMessaging();
    } catch (error) {
      const e = error as ApiError;
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }

      return [false, "Error al contactar con servidores de Vente."];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async appleShouldRegister(id: string) {
    try {
      var shouldRegister = await this.axios!.get('/api/account/apple_should_register?id=' + id);
      console.log('Should register: ' + shouldRegister.data);
      return [true, shouldRegister.data];
    } catch (e) {
      console.log('apple should register: ' + e);
      return [false, null];
    }
  }

  public async appleRegister(id: string, userName: string, gender: number, birthDate: Date | null): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/register_apple', {
        id,
        gender,
        birthDate,
        userName,
      });

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
      await this.checkAndInitializeMessaging();
    } catch (e) {
      console.log('apple register: ' + e);
      return [false, this.translateRegisterError(e)];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async appleLogin(id: string): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/login_apple?id=' + id);

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
      await this.checkAndInitializeMessaging();
    } catch (error) {
      const e = error as ApiError;
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }

      return [false, "Error al contactar con servidores de Vente."];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async createAccount(username: string, email: string, password: string, gender: number, birthDate: Date | null): Promise<[boolean, string | null]> {
    const registerData = {
      email: email,
      userName: username,
      password: password,
      gender: gender,
      birthDate: birthDate?.toISOString()
    };

    try {
      const response = await this.axios!.post('/api/account/register', registerData);
      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
      await this.checkAndInitializeMessaging();
    } catch (e) {
      console.log('register: ' + e);

      return [false, this.translateRegisterError(e)];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async login(email: string, password: string): Promise<[boolean, string | null]> {
    const loginData = {
      email: email,
      password: password,
    };

    try {
      const response = await this.axios!.post('/api/account/login', loginData);
      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.log('login: ' + error);
      const e = error as ApiError;

      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }
      return [false, "Error al contactar con servidores de Vente."];
    }

    await this.getHasPfp();
    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async sendNotificationToken(token: string) {
    try {
      await this.axios!.post('/api/account/set_notification_key?key=' + token);
    } catch (e) {
      console.log('send notification token: ' + e);
      return false;
    }

    return true;
  }

  public async updateProfile(profile: Profile) {
    try {
      await this.axios!.post('/api/account/update_profile', {
        igHandle: profile.igHandle,
        name: profile.name,
        description: profile.description,
      });
    } catch (e) {
      console.log('update profile: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  //#endregion

  //#region Notes

  public async updateNote(note: string) {
    try {
      await this.axios!.post('/api/account/set_custom_note?note=' + note);
    } catch (e) {
      console.log('update note: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async removeNote() {
    try {
      await this.axios!.post('/api/account/remove_custom_note');
    } catch (e) {
      console.log('remove note: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  //#endregion

  //#region Exits

  public async getExits() {
    try {
      const response = await this.axios!.get('/api/exit/get_exits');

      response.data.forEach((exit: any) => {
        exit.dates = exit.dates.map((d: string) => new Date(d));
      });

      this.setExits(response.data);
    } catch (e) {
      console.log('get exits: ' + e);
    }
  }

  public async getInvitationExits() {
    try {
      const response = await this.axios!.get('/api/exit/get_invites');
      response.data.forEach((exit: any) => {
        exit.dates = exit.dates.map((d: string) => new Date(d));
      });
      this.setInvitedExits(response.data);

    } catch (e) {
      console.log('get invitation exits: ' + e);
    }
  }

  public async acceptInvite(exitId: number): Promise<[boolean, string | null]> {
    try {
      await this.axios!.post('/api/exit/accept_invite?id=' + exitId);
    } catch (error) {
      console.log('accept invite: ' + error);
      const e = error as ApiError;
      return [false, e.response?.data === "date_overlap" ? "Ya tienes una escapada en esta fecha" : "Error al aceptar la invitación"];
    }

    await this.getInvitationExits();
    await this.getExits();
    await this.exitAlbumAvailable();

    return [true, null];
  }

  public async declineInvite(exitId: number) {
    try {
      await this.axios!.post('/api/exit/decline_invite?id=' + exitId);
    } catch (e) {
      console.log('decline invite: ' + e);
      return false;
    }

    await this.getInvitationExits();

    return true;
  }

  public async registerExit(name: string | null, location: EventLocation, dates: Date[]) {
    try {
      await this.axios!.post('/api/exit/register', {
        name: name,
        locationId: location.id,
        dates: dates.map(d => d.toISOString()),
        noTzTransform: true
      });
    } catch (error) {
      console.log('register exit: ' + error);
      const e = error as ApiError;
      return [false, e.response?.data === "date_overlap" ? "Ya tienes una escapada en esta fecha" : "Error al registrar la escapada"];
    }

    await this.getExits();
    await this.exitAlbumAvailable();

    return [true, null];
  }

  public async cancelExit(exitId: number) {
    try {
      await this.axios!.post('/api/exit/cancel?id=' + exitId);
    } catch (e) {
      console.log('cancel exit: ' + e);
      return false;
    }

    await this.getExits();
    await this.exitAlbumAvailable();

    return true;
  }

  public async inviteUser(exitId: number, username: string): Promise<[boolean, string | null]> {
    try {
      await this.axios!.post('/api/exit/invite?id=' + exitId + '&userName=' + username)
    } catch (error) {
      console.log('invite user: ' + error);
      const e = error as ApiError;
      var message = "Ha sucedido un error desconocido";
      if (e.response?.data == "user_already_in_exit") {
        message = "El usuario ya está en la escapada";
      } else if (e.response?.data == "user_already_invited") {
        message = "El usuario ya tiene una invitación a esta escapada";
      } else if (e.response?.data == "user_not_found") {
        message = "El usuario no existe";
      }

      return [false, message];
    }

    await this.getExits();

    return [true, null];
  }

  public async kickUser(exitId: number, username: string) {
    try {
      await this.axios!.post('/api/exit/kick?id=' + exitId + '&userName=' + username)
    } catch (e) {
      console.log('kick user: ' + e);
      return false;
    }

    await this.getExits();

    return true;
  }

  public async queryVisitors(exitId: number, page: number, gender: number | null, ageRangeMin: number | null, ageRangeMax: number | null): Promise<string[] | null> {
    try {
      var query = '/api/exit/query_visitors?id=' + exitId + '&page=' + page;
      if (gender != null) query += '&gender=' + gender;
      if (ageRangeMin != null) query += '&ageRangeMin=' + ageRangeMin;
      if (ageRangeMax != null) query += '&ageRangeMax=' + ageRangeMax;

      const response = await this.axios!.get(query);
      const profiles: ExitUserQuery[] = response.data;

      profiles.forEach(profile => {
        this.usersQueryDb[profile.userName] = profile;
      });

      return profiles.map(profile => profile.userName);
    } catch (e) {
      console.log('query visitors: ' + e);
      return null;
    }
  }

  public async queryEventPlaces(exitId: number): Promise<EventPlace[] | null> {
    try {
      return (await this.axios?.get('/api/exit/query_event_places?id=' + exitId))!.data;
    } catch (e) {
      console.log('query event places: ' + e);
      return null;
    }
  }

  //#endregion

  //#region Safety

  public async report(username: string) {
    try {
      await this.axios!.post('/api/safety/report?username=' + username);
    } catch (e) {
      console.log('report: ' + e);
      return false;
    }
    return true;
  }

  public async block(username: string) {
    try {
      await this.axios!.post('/api/safety/block?username=' + username);
    } catch (e) {
      return false;
    }
    return true;
  }

  public async deleteAccount() {
    try {
      await this.axios!.post('/api/account/delete');
    } catch (e) {
      console.log('delete account: ' + e);
      return false;
    }
    return true;
  }

  public logout() {
    AsyncStorage.removeItem('authToken');
    this.stopMessagingConnection();
  }

  //#endregion

  //#region Albums

  public async exitAlbumAvailable() {
    try {
      const response = await this.axios!.get('/api/exit_album/allowed');
      this.setExitAlbumAvailable(response.data);
    } catch (e) {
      console.log('exit album available: ' + e);
    }
  }

  public async getOwnPictures(): Promise<boolean> {
    try {
      const response = await this.axios!.get('/api/exit_album/get_own_pictures');
      if (response.data) {
        const pictures = response.data.pictures.map((pic: any) => ({
          id: pic.id,
          uploader: pic.uploader,
          time: new Date(pic.time)
        }));
        this.setOwnPictures({
          albumId: response.data.albumId,
          pictures: pictures
        });
      } else {
        this.setOwnPictures(null);
      }
      return true;
    } catch (e) {
      console.log('get own pictures: ' + e);
      return false;
    }
  }

  public async getAlbums(): Promise<boolean> {
    try {
      const response = await this.axios!.get('/api/exit_album/get_albums');
      const albums = response.data.map((album: any) => ({
        id: album.id,
        locationId: album.locationId,
        eventTime: new Date(album.eventTime),
        pictures: album.pictures.map((pic: any) => ({
          id: pic.id,
          uploader: pic.uploader,
          time: new Date(pic.time)
        }))
      }));
      this.setSharedAlbums(albums);
      return true;
    } catch (e) {
      console.log('get albums: ' + e);
      return false;
    }
  }

  public async uploadPicture(uri: string): Promise<boolean> {
    const formData = new FormData();

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const file = {
        uri: uri,
        name: 'file',
        type: 'image/jpeg',
      } as unknown as Blob;
      formData.append('file', file);
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], 'file', { type: 'image/jpeg' });
      formData.append('file', file);
    }

    try {
      const response = await this.axios!.post('/api/exit_album/upload_picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      this.setCurrentAlbumId(response.data);
      return true;
    } catch (e) {
      console.log('upload picture: ' + e);
      return false;
    }
  }

  public async deletePicture(id: number): Promise<boolean> {
    try {
      await this.axios!.post('/api/exit_album/delete_picture?id=' + id);
      return true;
    } catch (e) {
      console.log('delete picture: ' + e);
      return false;
    }
  }

  public async fetchPictureBlob(albumId: number, pictureId: number): Promise<Blob | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return null;

      const response = await fetch(`${this.axios!.defaults.baseURL}/api/exit_album/access_picture/${albumId}/${pictureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch picture');
      }

      const blob = await response.blob();
      return blob;
    } catch (e) {
      console.log('fetch picture blob: ' + e);
      return null;
    }
  }

  public async getPictureStream(albumId: number, pictureId: number, omitTopBorderRadius?: boolean, omitBottomBorderRadius?: boolean): Promise<React.ReactElement | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return null;

      const url = `${this.axios!.defaults.baseURL}/api/exit_album/access_picture/${albumId}/${pictureId}`;

      return (
        <FastImage
          source={{
            uri: url,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }}
          style={{
            width: '100%',
            height: undefined,
            aspectRatio: 1,
          }}
        />
      );
    } catch (e) {
      console.log('get picture stream: ' + e);
      return null;
    }
  }

  //#endregion

  //#region Messages

  public setOpenedDm(username: string | null) {
    this.openedDm = username;
  }

  public resetMessages() {
    this.setAllMessages(null);
  }

  public async getMessageSummaries() {
    try {
      const response = await this.axios!.get('/api/messages/get_messages');
      this.setMessageSummaries(response.data);
    } catch (e) {
      console.log('get message summaries: ' + e);
    }
  }

  public async getUserMessages(username: string, lastUserMessageId: number | null | undefined) {
    try {
      var query = '/api/messages/from_user?username=' + username;
      if (lastUserMessageId) query += '&lastMessageId=' + lastUserMessageId;
      const response = await this.axios!.get(query);
      this.setAllMessages(messages => ({
        ...messages,
        [username]: [...(messages?.[username] || []), ...response.data],
      }));

    } catch (e) {
      console.log('get user messages: ' + e);
    }
  }

  public async sendMessage(username: string, message: string) {
    try {
      const tempId = uuidv4();
      this.setAllMessages(messages => ({
        ...messages,
        [username]: [{
          id: tempId,
          user: username,
          read: false,
          type: "Outgoing",
          messageType: "Text",
          textContent: message,
          timestamp: new Date(),
          waitingForAck: true
        }, ...(messages?.[username] || [])]
      }));

      await this.messageConnection!.invoke('SendDm', username, message, tempId);
    } catch (e) {
      console.log('send message: ' + e);
    }
  }

  public async markRead(username: string) {
    try {
      while (!this.messageConnection || this.messageConnection.state !== signalR.HubConnectionState.Connected) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.messageConnection.invoke('MarkRead', username);
      this.setMessageSummaries(messages => messages?.map(message => ({
        ...message,
        read: message.read || message.user === username
      })) || []);

    } catch (e) {
      console.log('mark read: ' + e);
    }
  }

  //#endregion


  // #region Group Messages

  public setOpenedGroup(exitId: number | null) {
    this.openedGroup = exitId;
  }

  public async getGroupMessageSummaries() {
    try {
      const response = await this.axios!.get('/api/group_messages/get_current');
      this.setGroupMessageSummaries(response.data);
    } catch (e) {
      console.log('get group message summaries: ' + e);
    }
  }

  public async getGroupMessages(exitId: number, lastMessageId: number | null | undefined) {
    try {
      var query = '/api/group_messages/from_exit?exitId=' + exitId;
      if (lastMessageId) query += '&lastMessageId=' + lastMessageId;
      const response = await this.axios!.get(query);
      this.setGroupMessages(groupMessages => ({
        ...groupMessages,
        [exitId]: [...(groupMessages?.[exitId] || []), ...response.data],
      }));

    } catch (e) {
      console.log('get group messages: ' + e);
    }
  }

  public async sendGroupMessage(exitId: number, message: string) {
    try {
      const tempId = uuidv4();
      this.setGroupMessages(groupMessages => ({
        ...groupMessages,
        [exitId]: [{
          id: tempId,
          senderUsername: this.username!,
          messageType: "Text",
          textContent: message,
          readBy: [],
          timestamp: new Date()
        }, ...(groupMessages?.[exitId] || [])]
      }));

      await this.messageConnection!.invoke('SendGroupDm', exitId, message, tempId);
    } catch (e) {
      console.log('send group message: ' + e);
    }
  }

  public async markGroupMessageRead(exitId: number) {
    try {
      while (!this.messageConnection || this.messageConnection.state !== signalR.HubConnectionState.Connected) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.messageConnection.invoke('MarkGroupRead', exitId);
      this.setGroupMessages(groupMessages => {
        const newGroupMessages = { ...groupMessages };
        if (newGroupMessages[exitId]) {
          newGroupMessages[exitId] = newGroupMessages[exitId].map(message => ({
            ...message,
            readBy: message.readBy.includes(this.username!)
              ? message.readBy
              : [...(message.readBy || []), this.username!]
          }));
        }
        return newGroupMessages;
      });

    } catch (e) {
      console.log('mark group read: ' + e);
    }
  }


  // #endregion

  // #region Likes 

  public async likeProfile(username: string, exitId: number) {
    try {
      this.usersQueryDb[username].userLiked = false;
      this.usersQueryDb[username].likes--;
      await this.axios!.post(`/api/like/like_profile?username=${encodeURIComponent(username)}&exitId=${encodeURIComponent(exitId)}`);
    } catch (e) {
      console.log('like profile: ' + e);
    }
  }

  public async unlikeProfile(username: string, exitId: number) {
    try {
      this.usersQueryDb[username].userLiked = false;
      this.usersQueryDb[username].likes--;
      await this.axios!.post('/api/like/unlike_profile?username=' + username + '&exitId=' + exitId);
    } catch (e) {
      console.log('unlike profile: ' + e);
    }
  }

  // #endregion

  // #region Notifications

  public async getNotifications() {
    try {
      const response = await this.axios!.get('/api/notifications/get_all');
      this.setNotifications(response.data);
    } catch (e) {
      console.log('get notifications: ' + e);
    }
  }

  public async markNotificationsAsRead() {
    try {
      await this.axios!.post('/api/notifications/mark_read');
    } catch (e) {
      console.log('mark notifications as read: ' + e);
    }
  }

  // #endregion

  // #region Searching

  public async searchUsers(query: string): Promise<SearchUser[]> {
    try {
      const response = await this.axios!.get(`/api/user_search?q=${encodeURIComponent(query)}`);
      response.data.forEach((user: any) => {
        this.pfpDb[user.username] = user.pfpUrl;
      });
      return response.data;
    } catch (e) {
      console.log('search users: ' + e);
      return [];
    }
  }

  public async searchUsersFriendPriority(query: string): Promise<SearchUser[]> {
    try {
      const response = await this.axios!.get(`/api/user_search_friends?q=${encodeURIComponent(query)}`);
      response.data.forEach((user: any) => {
        this.pfpDb[user.username] = user.pfpUrl;
      });
      return response.data;
    } catch (e) {
      console.log('search users friend priority: ' + e);
      return [];
    }
  }

  // #endregion

  // #region Following
  public async getFriends() {
    try {
      const response = await this.axios!.get('/api/follow/friends');
      this.setFriends(response.data);
    } catch (e) {
      console.log('get friends: ' + e);
    }
  }

  public async followUser(username: string) {
    try {
      await this.axios!.post(`/api/follow/follow?username=${encodeURIComponent(username)}`);
    } catch (e) {
      console.log('follow user: ' + e);
    }
  }

  public async unfollowUser(username: string) {
    try {
      await this.axios!.post(`/api/follow/unfollow?username=${encodeURIComponent(username)}`);
    } catch (e) {
      console.log('unfollow user: ' + e);
    }
  }

  public async getOutgoingSolicitations() {
    try {
      const response = await this.axios!.get('/api/follow/get_outgoing_solicitations');
      this.setOutgoingSolicitations(response.data);
    } catch (e) {
      console.log('get outgoing solicitations: ' + e);
    }
  }

  public async getIncomingSolicitations() {
    try {
      const response = await this.axios!.get('/api/follow/get_incoming_solicitations');
      this.setIncomingSolicitations(response.data);
    } catch (e) {
      console.log('get incoming solicitations: ' + e);
    }
  }

  public async acceptSolicitation(username: string) {
    try {
      await this.axios!.post(`/api/follow/accept?username=${encodeURIComponent(username)}`);
      this.setOutgoingSolicitations(solicitations => solicitations?.filter(solicitation => solicitation.username !== username) || []);
    } catch (e) {
      console.log('accept solicitation: ' + e);
    }
  }

  public async rejectSolicitation(username: string) {
    try {
      await this.axios!.post(`/api/follow/reject?username=${encodeURIComponent(username)}`);
      this.setIncomingSolicitations(solicitations => solicitations?.filter(solicitation => solicitation.username !== username) || []);
    } catch (e) {
      console.log('reject solicitation: ' + e);
    }
  }

  // #endregion

  // #region statuses

  public async getStatuses() {
    try {
      const response = await this.axios!.get('/api/status/get_statuses');
      this.setStatuses(response.data);
    } catch (e) {
      console.log('get statuses: ' + e);
    }
  }
  // #endregion

  public async getCurrentNews(selectedExitId: number): Promise<CurrentNews | null> {
    try {
      const response = await this.axios!.get('/api/news/get_current?exitId=' + selectedExitId + '&testing=true');
      return response.data;
    } catch (e) {
      console.log('get current news: ' + e);
      return null;
    }
  }

  private async axios_instance(url: string) {
    var instance = axios.create({
      withCredentials: true,
      baseURL: url
    });

    instance.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
  }

  private translateRegisterError(e: unknown) {
    var errorMessage = "Ha sucedido un error desconocido";
    const error = e as ApiError;
    if (error.response) {
      if (error.response.data == "User must be at least 16 years old.") {
        errorMessage = "Tiene que tener al menos 16 años";
      } else {
        try {
          const errors = error.response.data as RegisterError[];
          errors.forEach((element: RegisterError) => {
            if (element.code == 'DuplicateUserName') {
              errorMessage = "Ya hay alguien con este nombre de usuario";
            } else if (element.code == 'DuplicateEmail') {
              errorMessage = "Ya hay alguien con este email";
            } else if (element.code == 'InvalidUserName') {
              errorMessage = "Nombre de usuario invalido";
            } else if (element.code == 'InvalidEmail') {
              errorMessage = "Correo invalido";
            }
          });
        } catch { }
      }
    }
    return errorMessage;
  }
}