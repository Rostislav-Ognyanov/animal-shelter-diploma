import { readStoredToken } from '../auth/authStorage.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const AUTH_REQUIRED_EVENT = 'app:auth-required';

function unwrapApiPayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.hasOwn(payload, 'success') &&
    Object.hasOwn(payload, 'data')
  ) {
    return payload.data;
  }

  return payload;
}

function buildRequestHeaders(headers = {}) {
  const authToken = readStoredToken();
  const requestHeaders = {
    ...headers,
  };

  if (authToken) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  return requestHeaders;
}

function shouldBroadcastAuthRequired(pathname, status) {
  if (status !== 401) {
    return false;
  }

  return pathname !== '/api/auth/login' && pathname !== '/api/auth/register';
}

function notifyAuthRequired(message) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_REQUIRED_EVENT, {
      detail: {
        message,
      },
    })
  );
}

async function requestApi(pathname, options = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    credentials: 'include',
    ...options,
    headers: buildRequestHeaders(options.headers),
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}.`;
    let errorPayload = null;

    try {
      errorPayload = await response.json();

      if (errorPayload?.message) {
        errorMessage = errorPayload.message;
      }
    } catch {
      // Ignore JSON parsing errors for non-JSON responses.
    }

    if (shouldBroadcastAuthRequired(pathname, response.status)) {
      notifyAuthRequired(errorMessage);
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = errorPayload;

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

async function requestJson(pathname, options = {}) {
  const payload = await requestApi(pathname, options);
  return unwrapApiPayload(payload);
}

export async function fetchApi(pathname) {
  return requestApi(pathname);
}

export async function fetchJson(pathname) {
  return requestJson(pathname);
}

export async function postJson(pathname, body) {
  return requestJson(pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function patchJson(pathname, body) {
  return requestJson(pathname, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function deleteJson(pathname) {
  return requestJson(pathname, {
    method: 'DELETE',
  });
}
