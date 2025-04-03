// LoginPage.tsx
import { useState } from 'react';
import { Text, View, Dimensions, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { MarginItem, BiggerMarginItem } from '@/components/MarginItem';
import { StyledTextInput, StyledEmailInput, StyledPasswordInput } from '@/components/StyledInput';
import { ErrorText, ThemedText } from '@/components/ThemedText';
import { BtnSecondary, BtnPrimary, GoogleButton } from '@/components/Buttons';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Controller, useForm } from 'react-hook-form';
import { useApi } from '@/api';
import { StyledGenderPicker } from '@/components/GenderPicker';
import { StyledDatePicker } from '@/components/StyledDatePicker';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import { redirectStore } from '@/redirect_storage';
import { TosAccept } from '@/components/TosAccept';

// Define the type for the props that LoginPage will accept
type AuthPageProps = {
  onLogin: () => void;
};

if (Platform.OS == 'android') {
  GoogleSignin.configure({
    // This points to an actual web application oauth entry, but an android one still needs to exist with proper signing key
    webClientId: '504803014413-nhv61u03k494e7c54pu7558235s6iaee.apps.googleusercontent.com',
    // androidClientId: '504803014413-b3gv875cvmr8lmk1h8ifdb29uutp6t2g.apps.googleusercontent.com'
  });
} else {
  GoogleSignin.configure({
    webClientId: '504803014413-k3b72t4tnsbinalp2ks8f4028rt87qbf.apps.googleusercontent.com',
    iosClientId: '504803014413-k3b72t4tnsbinalp2ks8f4028rt87qbf.apps.googleusercontent.com',
    // iosClientId: 'com.googleusercontent.apps.504803014413-k3b72t4tnsbinalp2ks8f4028rt87qbf',
    // scopes: [], // what API you want to access on behalf of the user, default is email and profile
    // offlineAccess: false, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    // hostedDomain: 'venteapp.es', // specifies a hosted domain restriction
    // forceCodeForRefreshToken: false, // [Android] related to `serverAuthCode`, read the docs link below *.
    // accountName: '', // [Android] specifies an account name on the device that should be used
    // googleServicePlistPath: '', // [iOS] if you renamed your GoogleService-Info file, new name here, e.g. "GoogleService-Info-Staging"
    // openIdRealm: '', // [iOS] The OpenID2 realm of the home web server. This allows Google to include the user's OpenID Identifier in the OpenID Connect ID token.
    // profileImageSize: 120, // [iOS] The desired height (and width) of the profile image. Defaults to 120px
  });
}

const profileUrl = 'profile';

const Auth: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState("main");
  const [googleId, setGoogleId] = useState<string>("");
  const [appleId, setAppleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { api } = useApi();

  const googleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        setError('Error al iniciar sesión con Google');
        setLoading(false);
        return;
      }

      var token = response.data.idToken;

      if (token == null) {
        setLoading(false);
        setError('Error al iniciar sesión con Google');
        return;
      }

      var [successful, shouldRegister] = await api.googleShouldRegister(token);

      if (!successful) {
        setLoading(false);
        setError('Error al iniciar sesión con Google');
        return;
      }

      if (shouldRegister) {
        setError(null);
        setGoogleId(token);
        setCurrentPage('googleRegister');
      } else {
        var [success, message] = await api.googleLogin(token);

        if (!success) {
          setLoading(false);
          setError(message);
        } else {
          setError(null);
          onLogin();
        }
      }
    } catch (e) {
      console.log(e);
      setError('Error al iniciar sesión con Google');
    }
    setLoading(false);
  };

  const appleSignIn = async () => {
    setLoading(true);
    try {
      if (!appleAuth.isSupported) {
        setError('Iniciar session con apple no esta disponible en este dispositivo.');
        setLoading(false);
        return;
      }

      const appleCredential = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [
          appleAuth.Scope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;
      if (!identityToken) {
        setError('Error al iniciar sesión con Apple');
        setLoading(false);
        return;
      }

      const [successful, shouldRegister] = await api.appleShouldRegister(identityToken);
      if (!successful) {
        setError('Error al iniciar sesión con Apple');
        setLoading(false);
        return;
      }

      if (shouldRegister) {
        setAppleId(identityToken);
        setError(null);
        setCurrentPage('appleRegister');
      } else {
        const [success, message] = await api.appleLogin(identityToken);
        if (!success) {
          setError(message);
          setLoading(false);
        } else {
          setError(null);
          onLogin();
        }
      }
    } catch (e) {
      console.log(e);
      setError('Error al iniciar sesión con Apple');
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading></FullScreenLoading>;
  }

  return (
    <View>
      {(currentPage == "main") && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'stretch' }}>
          <View>
            <MarginItem>
              <BtnPrimary title='Crea una cuenta' onClick={() => { setCurrentPage('register') }}></BtnPrimary>
            </MarginItem>
            <MarginItem>
              <BtnSecondary title='Iniciar Session' onClick={() => { setCurrentPage('login') }}></BtnSecondary>
            </MarginItem>
          </View>

          <View style={{ flexDirection: 'row', marginVertical: 20, alignItems: 'center' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'white' }}></View>
            <Text style={{ color: 'white', margin: 5, fontSize: 15 }}>o</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'white' }}></View>
          </View>

          <MarginItem>
            <GoogleButton title='Continua con google' onClick={googleSignIn} />
            {Platform.OS == 'ios' && (
              <AppleButton buttonStyle={AppleButton.Style.WHITE} buttonType={AppleButton.Type.CONTINUE} style={{
                marginTop: 5,
                width: '100%',
                height: 40,
              }} onPress={appleSignIn} />
            )}
          </MarginItem>
        </View>)}
      {(currentPage == "login" || currentPage == 'register') && (
        <BtnSecondary title='Ir atrás' onClick={() => setCurrentPage('main')}></BtnSecondary>
      )}
      {(currentPage == "register") && (
        <Register onLogin={onLogin}></Register>
      )}
      {(currentPage == "login") && (
        <Login onLogin={onLogin}></Login>
      )}
      {(currentPage == "googleRegister") && (
        <GoogleRegister id={googleId} onLogin={onLogin}></GoogleRegister>
      )}
      {(currentPage == "appleRegister") && (
        <AppleRegister id={appleId} onLogin={onLogin}></AppleRegister>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </View>
  );
};

const viewWidth = Dimensions.get('window').width * 0.8;

const Login: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { api } = useApi();

  const schema = yup.object().shape({
    email: yup.string().required('El correo es obligatorio').email('Dirección invalida'),
    password: ProperPassword(),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onPressSend = async (formData: any) => {
    setLoading(true);
    var [ok, message] = await api.login(formData.email, formData.password);
    setError(!ok);
    if (ok) {
      onLogin();
    } else {
      setErrorMessage(message as string);
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading />
  }

  return (
    <View style={{
      width: viewWidth
    }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal={false}
        >
          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledEmailInput value={value} setValue={onChange}></StyledEmailInput>
              )}
              name="email"
            />
            {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledPasswordInput title='Contraseña' value={value} setValue={onChange}></StyledPasswordInput>
              )}
              name="password"
            />
            {errors.password && <ErrorText>{errors.password.message}</ErrorText>}
          </MarginItem>

          <BiggerMarginItem>
            {(error) && (
              <ErrorText>{errorMessage}</ErrorText>
            )}
            <BtnPrimary title='Iniciar session' onClick={handleSubmit(onPressSend)}></BtnPrimary>
          </BiggerMarginItem>
        </ScrollView>
      </KeyboardAvoidingView>
    </View >
  )
};

const Register: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { api } = useApi();

  const schema = yup.object().shape({
    username: yup.string().required('El nombre de usuario es obligatorio'),
    email: yup.string().required('El correo es obligatorio').email('Dirección invalida'),
    password: ProperPassword(),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1, 2], 'Género inválido'),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      gender: 2,
    },
  });

  const onPressSend = async (formData: any) => {
    setLoading(true);

    if (!termsAccepted) {
      setLoading(false);
      setError("Tiene que aceptar los términos y condiciones.");
      return;
    }

    var [ok, error] = await api.createAccount(formData.username, formData.email, formData.password, formData.gender, birthDate);
    setError(error);
    if (ok) {
      onLogin();
      redirectStore.setPendingRedirect(profileUrl);
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading />
  }

  return (
    <View style={{
      width: viewWidth
    }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal={false}
        >
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <ThemedText type='title'>Crea tu cuenta</ThemedText>
            <ThemedText>La fecha de nacimiento y genero son opcionales, pero no se podrán cambiar en el futuro.</ThemedText>
          </View>

          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledTextInput title='Nombre de usuario' placeholder='' value={value} setValue={onChange} autoCapitalize='none'></StyledTextInput>
              )}
              name="username"
            />
            {errors.username && <ErrorText>{errors.username.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledEmailInput value={value} setValue={onChange}></StyledEmailInput>
              )}
              name="email"
            />
            {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledPasswordInput title='Contraseña' value={value} setValue={onChange}></StyledPasswordInput>
              )}
              name="password"
            />
            {errors.password && <ErrorText>{errors.password.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <ThemedText>Genero</ThemedText>
            <StyledGenderPicker gender={watch("gender")} control={control} errorsGender={errors.gender} />
          </MarginItem>

          <StyledDatePicker date={birthDate} setDate={setBirthDate} title='Fecha de nacimiento' />

          <TosAccept accepted={termsAccepted} setAccepted={setTermsAccepted} />

          <BiggerMarginItem>
            {(error) && (
              <ErrorText>
                {error}
              </ErrorText>
            )}
            <BtnPrimary title='Crea tu cuenta' onClick={handleSubmit(onPressSend)}></BtnPrimary>
          </BiggerMarginItem>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
};

type ThirdPartyRegisterProps = {
  onLogin: () => void;
  id: string;
};

const GoogleRegister: React.FC<ThirdPartyRegisterProps> = ({ onLogin, id }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { api } = useApi();

  const schema = yup.object().shape({
    username: yup.string().required('El nombre de usuario es obligatorio'),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1, 2], 'Género inválido'),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: '',
      gender: 2,
    },
  });

  const onPressSend = async (formData: any) => {
    setLoading(true);

    if (!termsAccepted) {
      setLoading(false);
      setError("Tiene que aceptar los términos y condiciones.");
      return;
    }

    var [ok, error] = await api.googleRegister(id, formData.username, formData.gender, birthDate);
    setError(error);
    if (ok) {
      onLogin();
      redirectStore.setPendingRedirect(profileUrl);
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading />
  }

  return (
    <View style={{
      width: viewWidth
    }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal={false}
        >
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <ThemedText type='title'>Crea tu cuenta</ThemedText>
            <ThemedText>La fecha de nacimiento y genero son opcionales, pero no se podrán cambiar en el futuro.</ThemedText>
          </View>

          <MarginItem>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <StyledTextInput title='Nombre de usuario' placeholder='' value={value} setValue={onChange} autoCapitalize='none'></StyledTextInput>
              )}
              name="username"
            />
            {errors.username && <ErrorText>{errors.username.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <ThemedText>Genero</ThemedText>
            <StyledGenderPicker gender={watch("gender")} control={control} errorsGender={errors.gender} />
          </MarginItem>

          <StyledDatePicker date={birthDate} setDate={setBirthDate} title='Fecha de nacimiento' />

          <TosAccept accepted={termsAccepted} setAccepted={setTermsAccepted} />

          <BiggerMarginItem>
            {(error) && (
              <ErrorText>
                {error}
              </ErrorText>
            )}
            <BtnPrimary title='Crea tu cuenta' onClick={handleSubmit(onPressSend)}></BtnPrimary>
          </BiggerMarginItem>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const AppleRegister: React.FC<ThirdPartyRegisterProps> = ({ onLogin, id }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { api } = useApi();

  const schema = yup.object().shape({
    username: yup.string().required('El nombre de usuario es obligatorio'),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1, 2], 'Género inválido'),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: '',
      gender: 2,
    },
  });

  const onPressSend = async (formData: any) => {
    setLoading(true);

    if (!termsAccepted) {
      setLoading(false);
      setError("Tiene que aceptar los términos y condiciones.");
      return;
    }

    const [ok, error] = await api.appleRegister(id, formData.username, formData.gender, birthDate);
    setError(error);
    if (ok) {
      onLogin();
      redirectStore.setPendingRedirect(profileUrl);
    }
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading />;
  }

  return (
    <View style={{ width: viewWidth }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal={false}
        >
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <ThemedText type='title'>Crea tu cuenta</ThemedText>
            <ThemedText>La fecha de nacimiento y genero son opcionales, pero no se podrán cambiar en el futuro.</ThemedText>
          </View>

          <MarginItem>
            <Controller
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <StyledTextInput
                  title="Nombre de usuario"
                  placeholder=""
                  value={value}
                  setValue={onChange}
                  autoCapitalize="none"
                />
              )}
              name="username"
            />
            {errors.username && <ErrorText>{errors.username.message}</ErrorText>}
          </MarginItem>

          <MarginItem>
            <ThemedText>Genero</ThemedText>
            <StyledGenderPicker gender={watch("gender")} control={control} errorsGender={errors.gender} />
          </MarginItem>

          <StyledDatePicker date={birthDate} setDate={setBirthDate} title="Fecha de nacimiento" />

          <TosAccept accepted={termsAccepted} setAccepted={setTermsAccepted} />

          <BiggerMarginItem>
            {error && <ErrorText>{error}</ErrorText>}
            <BtnPrimary title="Crea tu cuenta" onClick={handleSubmit(onPressSend)} />
          </BiggerMarginItem>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function ProperPassword() {
  return yup.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .matches(/[^a-zA-Z0-9]/, 'La contraseña debe tener al menos un carácter no alfanumérico.')
    .matches(/\d/, 'La contraseña debe tener al menos un dígito (0-9).')
    .matches(/[A-Z]/, 'La contraseña debe tener al menos una letra mayúscula (A-Z).')
    .required('La contraseña es requerida.');
}

export default Auth;
