import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

export enum AuthResult {
  UnkownError,
  Authenticated,
  Unauthenticated
}

type Profile = {
  username: string,
  name?: string,
  ig?: string,
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

export const ApiProvider = ({ children }: { children: React.ReactNode }) => {
  // const [apiInstance] = useState(new Api('http://192.168.1.53:5192'));
  const [apiInstance] = useState(new Api('http://localhost:5192'));

  return (
    <ApiContext.Provider value={apiInstance} >
      {children}
    </ApiContext.Provider>
  );
};

export class Api {
  public user_profile: Profile | null;

  api_url: string;
  locations: [EventLocation] | null;

  public constructor(url: string) {
    this.api_url = url;
    this.user_profile = null;
    this.locations = null;
  }

  public async getUserInfo() {
    try {
      const response = await axios.get(this.api_url + '/api/account/info');
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
      this.locations = (await axios.get(this.api_url + '/api/get_locations')).data;
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
      await axios.post(this.api_url + '/api/account/register', registerData);
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

  async login(email: string, password: string): Promise<[boolean, string | null]> {
    const loginData = {
      email: email,
      password: password,
    };

    try {
      await axios.post(this.api_url + '/api/account/login', loginData);
    } catch (e) {
      if (e.response && e.response.status == 400) {
        return [false, "Correo o contraseña incorrecta."];
      }
      return [false, "Error al contactar con servidores de VoyA."];
    }

    return [true, null];
  }
}
