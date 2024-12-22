const API_URL = '192.168.1.53:5192';

export async function isLoggedIn() {
  const response = await fetch(API_URL as string + '/api/account/info');
  return response.ok;
}

export async function createAccount(name: string, username: string, email: string, password: string, ig?: string) {
  const registerData = {
    email: email,
    igHandle: ig,
    userName: username,
    name: name,
    password: password,
  };

  const response = await fetch(API_URL as string + '/api/account/register', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registerData),
  });
  return response.ok;
}

export async function login(email: string, password: string) {
  const loginData = {
    email: email,
    password: password,
  };

  const response = await fetch(API_URL as string + '/api/account/login', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  });
  return response.ok;
}