import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text } from 'react-native';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CenterAligned, FullScreenLoading } from './components/ThemedComponents';

export enum AuthResult {
  UnkownError,
  Authenticated,
  Unauthenticated
}

type Profile = {
  userName: string,
  name?: string,
  igHandle?: string,
  description?: string,
  eventStatus: EventStatus,
};

type EventStatus = {
  active: boolean,
  date?: Date,
  with?: [string],
  location?: EventLocation
}

type EventLocation = {
  id: number,
  name: String,
};

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
      await instance.init('http://localhost:5192');
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
  public user_profile: Profile | null;

  locations: [EventLocation] | null;
  axios: AxiosInstance | null;

  constructor() {
    this.user_profile = null;
    this.locations = null;
    this.axios = null;
  }

  public async init(url: string) {
    this.axios = await this.axios_instance(url);
  }

  public async getUserInfo() {
    try {
      const response = await this.axios!.get('/api/account/info');
      this.user_profile = response.data;
      return AuthResult.Authenticated;
    } catch (e) {
      if (e.response && e.response.status === 401) {
        return AuthResult.Unauthenticated;
      }
    }
    return AuthResult.UnkownError;
  }

  public async getLocations() {
    try {
      this.locations = (await this.axios!.get('/api/get_locations')).data;
      return true;
    } catch {
      return false;
    }
  }

  public async createAccount(username: string, email: string, password: string): Promise<[boolean, string | null]> {
    const registerData = {
      email: email,
      userName: username,
      password: password,
    };

    try {
      await this.axios!.post('/api/account/register', registerData);
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
      await this.axios!.post('/api/account/login', loginData);
    } catch (e) {
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }
      return [false, "Error al contactar con servidores de VoyA."];
    }

    return [true, null];
  }

  public async updateProfile(profile: Profile) {
    try {
      await this.axios!.post('/api/account/update_profile', {
        igHandle: profile.igHandle,
        name: profile.name,
        description: profile.description,
      });
    } catch {
      return false;
    }
    return true;
  }

  private async axios_instance(url: string) {
    var instance = axios.create({
      withCredentials: true,
      baseURL: url
    });

    instance.interceptors.request.use(async (config) => {
      const cookies = await get_cookies();
      if (cookies) {
        config.headers['Cookie'] = cookies;
      }
      return config;
    });

    instance.interceptors.response.use(async (response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        await set_cookies(setCookie.join("; "));
      }
      return response;
    })

    return instance;
  }
}

async function get_cookies() {
  return await AsyncStorage.getItem("api_cookies");
}

async function set_cookies(cookies: string) {
  return await AsyncStorage.setItem("api_cookies", cookies);
}