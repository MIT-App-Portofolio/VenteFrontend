import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenLoading } from './components/FullScreenLoading';
import { Platform } from 'react-native';

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
  years: number,
  name?: string,
  igHandle?: string,
  description?: string,
  eventStatus: EventStatus,
};

export type EventStatus = {
  active: boolean,
  time?: Date,
  with?: string[],
  location?: EventLocation
}

export type EventLocation = {
  id: number,
  name: string,
};

export type EventPlace = {
  name: string,
  description: string,
  imageUrls: string[],
  priceRangeBegin: number,
  priceRangeEnd: number,
  ageRequirement?: number,
  googleMapsLink?: string,
  events: EventPlaceEvent[]
}

export type EventPlaceEvent = {
  name: string,
  description: string,
  image?: string,
  time: Date,
  offers: EventPlaceOffer[]
}

export type EventPlaceOffer = {
  name: string,
  description?: string,
  price?: number,
}

const ApiContext = createContext<{
  api: Api,
  userProfile: Profile | null,
  userPfp: string | null,
  inviteStatus: InviteStatus | null
  groupStatus: GroupStatus | null
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
  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null);
  const [groupStatus, setGroupStatus] = useState<GroupStatus | null>(null);

  useEffect(() => {
    const initializeApi = async () => {
      const instance = new Api(setUserProfile, setUserPfp, setInviteStatus, setGroupStatus);
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
    <ApiContext.Provider value={{ api, userProfile, userPfp, inviteStatus, groupStatus }}>
      {children}
    </ApiContext.Provider>
  );
};

export class Api {
  public locations: EventLocation[] | null;

  private axios: AxiosInstance | null;
  private usersDb: { [key: string]: Profile } = {};
  private pfpDb: { [key: string]: string } = {};
  private username: string | null;

  private setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  private setInviteStatus: React.Dispatch<React.SetStateAction<InviteStatus | null>>;
  private setUserPfp: React.Dispatch<React.SetStateAction<string | null>>;
  private setGroupStatus: React.Dispatch<React.SetStateAction<GroupStatus | null>>;

  constructor(
    setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
    setUserPfp: React.Dispatch<React.SetStateAction<string | null>>,
    setInviteStatus: React.Dispatch<React.SetStateAction<InviteStatus | null>>,
    setGroupStatus: React.Dispatch<React.SetStateAction<GroupStatus | null>>) {
    this.locations = null;
    this.axios = null;
    this.username = null;
    this.setUserProfile = setUserProfile;
    this.setUserPfp = setUserPfp;
    this.setInviteStatus = setInviteStatus;
    this.setGroupStatus = setGroupStatus
  }

  public async init(url: string) {
    this.axios = await this.axios_instance(url);
  }

  public hasUser(username: string) {
    return this.usersDb[username] !== undefined;
  }

  public async getUser(username: string) {
    if (this.usersDb[username]) {
      return this.usersDb[username];
    }

    try {
      const response = await this.axios!.get('/api/account/profile?username=' + username);
      const profile: Profile = response.data;
      this.usersDb[username] = profile;
      return profile;
    } catch {
      return null;
    }
  }

  // Assumes user is already in the db
  public getUserUnstable(username: string) {
    return this.usersDb[username];
  }

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
      await this.getGroupStatus();
      await this.getInviteStatus();

      return AuthResult.Authenticated;
    } catch (e) {
      console.log('user info: ' + e);
      if (e.response && e.response.status === 401) {
        return AuthResult.Unauthenticated;
      }
    }
    return AuthResult.UnknownError;
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

  // Assumes pfp is already in db
  public getPfpUnstable(userName: string) {
    return this.pfpDb[userName];
  }

  public async updateProfilePicture(uri: string) {
    const formData = new FormData();

    // I don't know why this is necessary, but it is. react native fetch blob is weird works on web but not on android
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      formData.append('file', {
        uri: uri,
        name: 'file',
        type: 'image/jpeg',
      });
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

  public async googleRegister(id: string, userName: string, gender: number, birthDate: Date): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/register_google', {
        id,
        gender,
        birthDate,
        userName,
      });

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
    } catch (e) {
      console.log('google register: ' + e);
      return [false, this.translateRegisterError(e)];
    }

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
    } catch (e) {
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }

      return [false, "Error al contactar con servidores de Vente."];
    }

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

  public async appleRegister(id: string, userName: string, gender: number, birthDate: Date): Promise<[boolean, string | null]> {
    try {
      const response = await this.axios!.post('/api/account/register_apple', {
        id,
        gender,
        birthDate,
        userName,
      });

      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
    } catch (e) {
      console.log('apple register: ' + e);
      return [false, this.translateRegisterError(e)];
    }

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
    } catch (e) {
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }

      return [false, "Error al contactar con servidores de Vente."];
    }

    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async createAccount(username: string, email: string, password: string, gender: number, birthDate: Date): Promise<[boolean, string | null]> {
    const registerData = {
      email: email,
      userName: username,
      password: password,
      gender: gender,
      birthDate: birthDate.toISOString()
    };

    try {
      const response = await this.axios!.post('/api/account/register', registerData);
      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
    } catch (e) {
      console.log('register: ' + e);

      return [false, this.translateRegisterError(e)];
    }

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
    } catch (e) {
      console.log('login: ' + e);

      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }
      return [false, "Error al contactar con servidores de Vente."];
    }

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
        gender: profile.gender,
      });
    } catch (e) {
      console.log('update profile: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async getInviteStatus() {
    try {
      const response = await this.axios!.get('/api/invite_status');
      this.setInviteStatus(response.data);
    }
    catch (e) {
      console.log('invite status: ' + e);
    }
  }

  public async acceptInvite() {
    try {
      await this.axios!.post('/api/accept_invite');
    } catch (e) {
      console.log('accept invite: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async declineInvite() {
    try {
      await this.axios!.post('/api/decline_invite');
    } catch (e) {
      console.log('decline invite: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async getGroupStatus() {
    try {
      const response = await this.axios!.get('/api/group_status');
      this.setGroupStatus(response.data);
    } catch (e) {
      console.log('group status: ' + e);
    }
  }

  public async registerEvent(location: EventLocation, date: Date) {
    try {
      await this.axios!.post('/api/register_event?location=' + location.id + '&time=' + date.toISOString());
    } catch (e) {
      console.log('register event: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async cancelEvent() {
    try {
      await this.axios!.post('/api/cancel_event');
    } catch (e) {
      console.log('cancel event: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async inviteUser(username: string) {
    try {
      await this.axios!.post('/api/invite_to_event?invited=' + username)
    } catch (e) {
      console.log('invite user: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async kickUser(username: string) {
    try {
      await this.axios!.post('/api/kick_from_event?kicked=' + username)
    } catch (e) {
      console.log('kick user: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async queryVisitors(page: number, gender: number | null, ageRangeMin: number | null, ageRangeMax: number | null): Promise<string[] | null> {
    try {
      var query = '/api/query_visitors?page=' + page;
      if (gender) query += '&gender=' + gender;
      if (ageRangeMin) query += '&ageRangeMin=' + ageRangeMin;
      if (ageRangeMax) query += '&ageRangeMax=' + ageRangeMax;

      const response = await this.axios!.get(query);
      const profiles: Profile[] = response.data;

      profiles.forEach(profile => {
        this.usersDb[profile.userName] = profile;
      });

      return profiles.map(profile => profile.userName);
    } catch (e) {
      console.log('query visitors: ' + e);
      return null;
    }
  }

  public async queryEventPlaces(): Promise<EventPlace[] | null> {
    try {
      return (await this.axios?.get('/api/query_event_places'))!.data;
    } catch (e) {
      console.log('query event places: ' + e);
      return null;
    }
  }

  private translateRegisterError(e: any) {
    var errorMessage = "Ha sucedido un error desconocido";
    if (e.response) {
      e.response.data.forEach(element => {
        if (element.code == 'DuplicateUserName') {
          errorMessage = "Ya hay alguien con este nombre de usuario";
        } else if (element.code == 'DuplicateEmail') {
          errorMessage = "Ya hay alguien con este email";
        }
      });
    }
    return errorMessage;
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
}