import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenLoading } from './components/FullScreenLoading';
import { Platform } from 'react-native';
import { date } from 'yup';
import FastImage from 'react-native-fast-image';

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
  name: string,
  description?: string,
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
  exits: Exit[] | null
  invitedExits: Exit[] | null
  customOffers: CustomOffer[] | null
  ownPictures: OwnPictures | null
  sharedAlbums: SharedAlbum[] | null
  currentAlbumId: number | null
  exitAlbumAvailable: boolean
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
        setExitAlbumAvailable
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
      exits,
      invitedExits,
      exitAlbumAvailable
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export class Api {
  public locations: EventLocation[] | null;

  private axios: AxiosInstance | null;
  private usersQueryDb: { [key: string]: ExitUserQuery } = {};
  private accountAccessDb: { [key: string]: Profile } = {};
  private pfpDb: { [key: string]: string } = {};
  private username: string | null;

  private setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  private setUserPfp: React.Dispatch<React.SetStateAction<string | null>>;
  private setCustomOffers: React.Dispatch<React.SetStateAction<CustomOffer[] | null>>;
  private setOwnPictures: React.Dispatch<React.SetStateAction<OwnPictures | null>>;
  private setSharedAlbums: React.Dispatch<React.SetStateAction<SharedAlbum[] | null>>;
  private setCurrentAlbumId: React.Dispatch<React.SetStateAction<number | null>>;
  private setExits: React.Dispatch<React.SetStateAction<Exit[] | null>>;
  private setInvitedExits: React.Dispatch<React.SetStateAction<Exit[] | null>>;
  private setExitAlbumAvailable: React.Dispatch<React.SetStateAction<boolean>>;

  constructor(
    setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
    setUserPfp: React.Dispatch<React.SetStateAction<string | null>>,
    setCustomOffers: React.Dispatch<React.SetStateAction<CustomOffer[] | null>>,
    setOwnPictures: React.Dispatch<React.SetStateAction<OwnPictures | null>>,
    setSharedAlbums: React.Dispatch<React.SetStateAction<SharedAlbum[] | null>>,
    setCurrentAlbumId: React.Dispatch<React.SetStateAction<number | null>>,
    setExits: React.Dispatch<React.SetStateAction<Exit[] | null>>,
    setInvitedExits: React.Dispatch<React.SetStateAction<Exit[] | null>>,
    setExitAlbumAvailable: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    this.locations = null;
    this.axios = null;
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
  }

  public async init(url: string) {
    this.axios = await this.axios_instance(url);
  }

  public hasUser(username: string) {
    return this.accountAccessDb[username] !== undefined || this.usersQueryDb[username] !== undefined;
  }

  public async getUser(username: string) {
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
    if (this.accountAccessDb[username]) {
      return this.accountAccessDb[username];
    }

    return this.usersQueryDb[username];
  }

  public async isAffiliate() {
    return (await this.axios?.get('/api/venue/is_affiliate'))!.data === true;
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
    } catch (error) {
      const e = error as ApiError;
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
    } catch (error) {
      const e = error as ApiError;
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
    } catch (error) {
      console.log('login: ' + error);
      const e = error as ApiError;

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
      });
    } catch (e) {
      console.log('update profile: ' + e);
      return false;
    }
    return await this.getUserInfo() == AuthResult.Authenticated;
  }

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
        dates: dates.map(d => d.toISOString())
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
      return false;
    }
    return true;
  }

  public logout() {
    AsyncStorage.removeItem('authToken');
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
}