import React, { createContext, useContext, useEffect, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenLoading } from './components/ThemedComponents';
import { Platform } from 'react-native';

export enum AuthResult {
  UnkownError,
  Authenticated,
  Unauthenticated
}

export type Profile = {
  userName: string,
  gender: number,
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
  offers: EventPlaceOffer[]
}

export type EventPlaceOffer = {
  name: string,
  activeOn: Date,
  description?: string,
  price?: number,
  image?: string
}

const ApiContext = createContext<Api | null>(null);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const [apiInstance, setApiInstance] = useState<Api | null>(null);

  useEffect(() => {
    const initializeApi = async () => {
      const instance = new Api();
      if (__DEV__) {
        if (Platform.OS === 'android') {
          await instance.init('http://10.0.2.2:5192');
        } else {
          await instance.init('http://localhost:5192');
        }
      }
      setApiInstance(instance);
    };

    initializeApi();
  }, []);

  if (!apiInstance) {
    return <FullScreenLoading></FullScreenLoading>;
  }

  return (
    <ApiContext.Provider value={apiInstance}>
      {children}
    </ApiContext.Provider>
  );
};

export class Api {
  public userProfile: Profile | null;
  public profilePicture: string | null;

  locations: EventLocation[] | null;
  axios: AxiosInstance | null;
  usersDb: { [key: string]: Profile } = {};
  pfpDb: { [key: string]: string } = {};

  constructor() {
    this.userProfile = null;
    this.profilePicture = null;
    this.locations = null;
    this.axios = null;
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
      this.userProfile = {
        ...response.data,
        eventStatus: {
          ...response.data.eventStatus,
          time: response.data.eventStatus.time ? new Date(response.data.eventStatus.time) : null,
        },
      };

      await this.fetchUserPfp();
      return AuthResult.Authenticated;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        return AuthResult.Unauthenticated;
      }
    }
    return AuthResult.UnkownError;
  }

  public async fetchUserPfp() {
    try {
      const response = await this.axios!.get('/api/access_pfp?userName=' + this.userProfile!.userName);
      const imageUrl = response.data;

      this.profilePicture = imageUrl;
    } catch {
      this.profilePicture = null;
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
      console.log(e);
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
    if (Platform.OS === 'android') {
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
      return false;
    }
  }

  public async getLocations() {
    try {
      this.locations = (await this.axios!.get('/api/get_locations')).data;
      return true;
    } catch {
      return false;
    }
  }

  public async createAccount(username: string, email: string, password: string, gender: number): Promise<[boolean, string | null]> {
    const registerData = {
      email: email,
      userName: username,
      password: password,
      gender: gender,
    };

    try {
      const response = await this.axios!.post('/api/account/register', registerData);
      const token = response.data;
      await AsyncStorage.setItem('authToken', token);
    } catch (e) {
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

      return [false, errorMessage];
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
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }
      return [false, "Error al contactar con servidores de VoyA."];
    }

    if (await this.getUserInfo() != AuthResult.Authenticated) {
      return [false, "Ha sucedido un error desconocido"];
    }

    return [true, null];
  }

  public async updateProfile(profile: Profile) {
    try {
      await this.axios!.post('/api/account/update_profile', {
        igHandle: profile.igHandle,
        name: profile.name,
        description: profile.description,
        gender: profile.gender,
      });
    } catch {
      return false;
    }
    return true;
  }

  public async registerEvent(location: EventLocation, date: Date) {
    try {
      await this.axios!.post('/api/register_event?location=' + location.id + '&time=' + date.toISOString());
    } catch (e) {
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async cancelEvent() {
    try {
      await this.axios!.post('/api/cancel_event');
    } catch {
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async inviteUser(username: string) {
    try {
      await this.axios!.post('/api/invite_to_event?invited=' + username)
    } catch {
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async kickUser(username: string) {
    try {
      await this.axios!.post('/api/kick_from_event?kicked=' + username)
    } catch {
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

  public async queryVisitors(page: number): Promise<string[] | null> {
    try {
      const response = await this.axios!.get('/api/query_visitors?page=' + page);
      const profiles: Profile[] = response.data;

      profiles.forEach(profile => {
        this.usersDb[profile.userName] = profile;
      });

      return profiles.map(profile => profile.userName);
    } catch {
      return null;
    }
  }

  public async queryEventPlaces(): Promise<EventPlace[] | null> {
    try {
      return (await this.axios?.get('/api/query_event_places'))!.data;
    } catch {
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
}