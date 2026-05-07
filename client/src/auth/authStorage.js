const AUTH_USER_STORAGE_KEY = 'animal_shelter_current_user';
const AUTH_TOKEN_STORAGE_KEY = 'animal_shelter_access_token';

function isBrowserEnvironment() {
  return typeof window !== 'undefined';
}

export function readStoredUser() {
  if (!isBrowserEnvironment()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user) {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
}

export function readStoredToken() {
  if (!isBrowserEnvironment()) {
    return '';
  }

  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeStoredToken(token) {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      return;
    }

    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
}
