import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { fetchJson, postJson } from '../lib/api.js';

const AuthContext = createContext(null);
const AUTH_REQUIRED_EVENT = 'app:auth-required';
const AUTH_REFRESH_SYNC_COOLDOWN_MS = 1000 * 30;
const DEFAULT_AUTH_NOTICE = 'Сесията ти е прекъсната. Влез отново, за да продължиш.';

function buildLoggedOutPayload() {
  return {
    authenticated: false,
    role: 'guest',
    user: null,
    authNotice: '',
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const lastAuthRefreshAtRef = useRef(0);

  function syncAuthState(payload) {
    const nextUser = payload?.user ?? null;

    setCurrentUser(nextUser);
  }

  function clearAuthNotice() {
    setAuthNotice('');
  }

  function handleForcedLogout(message = '') {
    syncAuthState(null);
    setErrorMessage('');
    setAuthNotice(String(message || DEFAULT_AUTH_NOTICE).trim() || DEFAULT_AUTH_NOTICE);
  }

  async function refreshAuth({ silent = false } = {}) {
    lastAuthRefreshAtRef.current = Date.now();

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const payload = await fetchJson('/api/auth/status');
      syncAuthState(payload.authenticated ? payload : null);
      setErrorMessage('');
      setAuthNotice(payload.authenticated ? '' : payload.authNotice || '');
      return payload;
    } catch (error) {
      setErrorMessage(error.message);
      throw error;
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  async function login(credentials) {
    const payload = await postJson('/api/auth/login', credentials);
    syncAuthState(payload);
    setErrorMessage('');
    clearAuthNotice();
    return payload;
  }

  async function register(registrationData) {
    const payload = await postJson('/api/auth/register', registrationData);
    syncAuthState(payload);
    setErrorMessage('');
    clearAuthNotice();
    return payload;
  }

  async function logout() {
    let payload = null;

    try {
      payload = await postJson('/api/auth/logout', {});
    } catch {
      payload = buildLoggedOutPayload();
    }

    syncAuthState(null);
    setErrorMessage('');
    clearAuthNotice();
    return payload;
  }

  function updateCurrentUser(nextUser) {
    setCurrentUser(nextUser ?? null);
    clearAuthNotice();
  }

  useEffect(() => {
    refreshAuth().catch(() => {
      // The app status view handles the case when auth bootstrap fails.
    });
  }, []);

  useEffect(() => {
    function handleAuthRequired(event) {
      handleForcedLogout(event?.detail?.message);
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, []);

  useEffect(() => {
    function shouldSyncAuthOnFocus() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return false;
      }

      return Date.now() - lastAuthRefreshAtRef.current >= AUTH_REFRESH_SYNC_COOLDOWN_MS;
    }

    function syncAuthOnFocus() {
      if (!shouldSyncAuthOnFocus()) {
        return;
      }

      refreshAuth({ silent: true }).catch(() => {});
    }

    window.addEventListener('focus', syncAuthOnFocus);
    document.addEventListener('visibilitychange', syncAuthOnFocus);

    return () => {
      window.removeEventListener('focus', syncAuthOnFocus);
      document.removeEventListener('visibilitychange', syncAuthOnFocus);
    };
  }, []);

  const value = {
    currentUser,
    isAuthenticated: Boolean(currentUser),
    role: currentUser?.role ?? 'guest',
    isLoading,
    errorMessage,
    authNotice,
    clearAuthNotice,
    refreshAuth,
    login,
    register,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
