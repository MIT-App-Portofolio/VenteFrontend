// LoginPage.tsx
import { useState } from 'react';
import { StyleSheet, TextInput, Modal, ActivityIndicator, View, Text, Button } from 'react-native';
import { BtnSecondary, BtnPrimary, StyledTextInput, StyledEmailInput, StyledPasswordInput } from '../components/ThemedComponents';
import Config from 'react-native-config';
import { createAccount, login } from './api';

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
          <BtnPrimary title='Crea una cuenta' onClick={() => { setCurrentPage('register') }}></BtnPrimary>
          <BtnSecondary title='Iniciar Session' onClick={() => { setCurrentPage('login') }}></BtnSecondary>
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

const Login: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    setLoading(true);
    var ok = await login(email, password);

    setError(!ok);
    setLoading(false);

    if (ok) {
      onLogin();
    }
  };

  return (
    <View>
      <Modal
        transparent={true}
        visible={loading}
        animationType="fade"
      >
        <View>
          <View>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        </View>
      </Modal>

      <MarginItem>
        <StyledEmailInput value={email} setValue={setEmail}></StyledEmailInput>
      </MarginItem>
      <MarginItem>
        <StyledPasswordInput title='Contraseña' value={password} setValue={setPassword}></StyledPasswordInput>
      </MarginItem>

      <BiggerMarginItem>
        <BtnPrimary title='Iniciar session' onClick={submit}></BtnPrimary>
      </BiggerMarginItem>
    </View>
  )
};

const Register: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [state, setState] = useState('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [ig, setIg] = useState('');

  const submit = async () => {
    setLoading(true);
    var ok = await createAccount(name, username, email, password, ig);
    setError(!ok);
    setLoading(false);
    if (ok) {
      onLogin();
    }
  };

  return (
    <View>
      <Modal
        transparent={true}
        visible={loading}
        animationType="fade"
      >
        <View>
          <View>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        </View>
      </Modal>
      {(state === 'email') && (
        <View>
          <MarginItem>
            <StyledTextInput title='Nombre de usuario' placeholder='' value={username} setValue={setUsername} autoCapitalize='none'></StyledTextInput>
          </MarginItem>
          <MarginItem>
            <StyledEmailInput value={email} setValue={setEmail}></StyledEmailInput>
          </MarginItem>
          <MarginItem>
            <StyledPasswordInput title='Contraseña' value={password} setValue={setPassword}></StyledPasswordInput>
          </MarginItem>

          <BiggerMarginItem>
            <BtnPrimary title='Continuar' onClick={() => setState('setup account')}></BtnPrimary>
          </BiggerMarginItem>
        </View>
      )}

      {(state === 'setup account') && (
        <View>
          <MarginItem>
            <StyledTextInput title='Tu nombre real' value={name} setValue={setName} autoCapitalize='words'></StyledTextInput>
          </MarginItem>
          <MarginItem>
            <StyledTextInput title='Nombre de usuario de Instagram (Opcional)' value={ig} setValue={setIg} autoCapitalize='none'></StyledTextInput>
          </MarginItem>

          {(error) && (
            <Text>Algo fue mal...</Text>
          )}

          <BiggerMarginItem>
            <BtnPrimary title='Crea tu cuenta' onClick={submit}></BtnPrimary>
          </BiggerMarginItem>
        </View>
      )}
    </View>
  )
};

function MarginItem({ children }) {
  return (
    <View style={{ marginTop: 5, marginBottom: 5 }}>{children}</View>
  )
}

function BiggerMarginItem({ children }) {
  return (
    <View style={{ marginTop: 15, marginBottom: 15 }}>{children}</View>
  )
}

export default Auth;
