import React, { createContext, useContext, useState } from 'react';

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
      var response = await fetch(this.api_url + '/api/account/info');
      if (response.ok) {
        this.user_profile = (await response.json());
      } else if (response.status == 401) {
        return AuthResult.Unauthenticated;
      }
    } catch (e) {
      console.log(e);
      return AuthResult.UnkownError;
    }

    return AuthResult.Authenticated;
  }

  public async getLocations() {
    var response = null;
    try {
      response = await fetch(this.api_url + '/api/get_locations');
    } catch {
      return false;
    }

    try {
      this.locations = await response.json();
    } catch {
      return false;
    }

    return response.ok;
  }

  public async createAccount(username: string, email: string, password: string): Promise<[boolean, string | null]> {
    const registerData = {
      email: email,
      userName: username,
      password: password,
    };

    var response = null;

    try {
      response = await fetch(this.api_url + '/api/account/register', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
    } catch {
      return [false, 'Ha sucedido un error desconocido'];
    }


    if (!response.ok) {
      var errorMessage = "Ha sucedido un error desconocido";
      try {
        (await response.json() as [any]).forEach(element => {
          if (element.code == 'DuplicateUserName') {
            errorMessage = "Ya hay alguien con este nombre de usuario";
          } else if (element.code == 'DuplicateEmail') {
            errorMessage = "Ya hay alguien con este email";
          }
        });
      } catch { }

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

    var response = null;

    try {
      response = await fetch(this.api_url + '/api/account/login', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });
    } catch {
      return [false, "Error al contactar con servidores de VoyA."];
    }

    if (!response.ok) {
      return [false, "Correo o contraseña incorrecta."];
    }

    return [true, null];
  }
}
