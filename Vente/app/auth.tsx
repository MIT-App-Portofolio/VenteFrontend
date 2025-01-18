// LoginPage.tsx
import { useState } from 'react';
import { Modal, ActivityIndicator, View, Dimensions } from 'react-native';
import { MarginItem, BiggerMarginItem } from '@/components/MarginItem';
import { StyledTextInput, StyledEmailInput, StyledPasswordInput } from '@/components/StyledInput';
import { ErrorText } from '@/components/ThemedText';
import { BtnSecondary, BtnPrimary } from '@/components/Buttons';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Controller, useForm } from 'react-hook-form';
import { useApi } from '@/api';
import { useRedirect } from '@/context/RedirectContext';
import { StyledGenderPicker } from '@/components/GenderPicker';
import { StyledDatePicker } from '@/components/StyledDatePicker';
import { FullScreenLoading } from '@/components/FullScreenLoading';

// Define the type for the props that LoginPage will accept
type AuthPageProps = {
  onLogin: () => void;
};

const Auth: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [currentPage, setCurrentPage] = useState("main");
  return (
    <View>
      {(currentPage == "main") && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'stretch' }}>
          <MarginItem>
            <BtnPrimary title='Crea una cuenta' onClick={() => { setCurrentPage('register') }}></BtnPrimary>
          </MarginItem>
          <MarginItem>
            <BtnSecondary title='Iniciar Session' onClick={() => { setCurrentPage('login') }}></BtnSecondary>
          </MarginItem>
        </View>)}
      {(currentPage == "login" || currentPage == 'register') && (
        <BtnSecondary title='Ir atras' onClick={() => setCurrentPage('main')}></BtnSecondary>
      )}
      {(currentPage == "register") && (
        <Register onLogin={onLogin}></Register>
      )}
      {(currentPage == "login") && (
        <Login onLogin={onLogin}></Login>
      )}
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
    email: yup.string().required('El correo es obligatorio').email('Dirreccion invalida'),
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
    </View >
  )
};

const Register: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const { api } = useApi();
  const { setRedirectTo } = useRedirect()!;

  const schema = yup.object().shape({
    username: yup.string().required('El nombre de usuario es obligatorio'),
    email: yup.string().required('El correo es obligatorio').email('Dirreccion invalida'),
    password: ProperPassword(),
    gender: yup.number().required('El género es obligatorio').oneOf([0, 1], 'Género inválido'),
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
      gender: 0,
    },
  });

  const onPressSend = async (formData: any) => {
    setLoading(true);

    if (birthDate == null) {
      setError('La fecha de nacimiento es obligatoria');
      setLoading(false);
      return;
    }

    var [ok, error] = await api.createAccount(formData.username, formData.email, formData.password, formData.gender, birthDate!);
    setError(error);
    if (ok) {
      onLogin();
      setRedirectTo('/profile');
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
      <View>
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

        <StyledGenderPicker gender={watch("gender")} control={control} errorsGender={errors.gender} />

        <StyledDatePicker date={birthDate} setDate={setBirthDate} title='Fecha de nacimiento' />

        <BiggerMarginItem>
          {(error) && (
            <ErrorText>
              {error}
            </ErrorText>
          )}
          <BtnPrimary title='Crea tu cuenta' onClick={handleSubmit(onPressSend)}></BtnPrimary>
        </BiggerMarginItem>
      </View>
    </View>
  )
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
