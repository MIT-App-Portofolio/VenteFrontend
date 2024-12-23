const API_URL = 'http://192.168.1.53:5192';

export async function isLoggedIn() {
  var response = null;
  try {
    response = await fetch(API_URL as string + '/api/account/info');
  } catch {
    return [true, false];
  }

  return [false, response.ok];
}

export async function createAccount(username: string, email: string, password: string): Promise<[boolean, string | null]> {
  const registerData = {
    email: email,
    userName: username,
    password: password,
  };

  var response = null;

  try {
    response = await fetch(API_URL as string + '/api/account/register', {
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
  return [true, null];
}

export async function login(email: string, password: string): Promise<[boolean, string | null]> {
  const loginData = {
    email: email,
    password: password,
  };

  var response = null;

  try {
    response = await fetch(API_URL as string + '/api/account/login', {
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