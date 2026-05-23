import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as ExpoSecureStore from 'expo-secure-store';

const DEFAULT_API_URL = 'https://super-simple-calendar-api.fly.dev';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
const TOKEN_KEY = 'ssc_token';
const REQUEST_TIMEOUT = 15000;
const TOKEN_FALLBACK_KEY = `secure_fallback:${TOKEN_KEY}`;

let secureStoreModule:
  | Pick<
      typeof ExpoSecureStore,
      'deleteItemAsync' | 'getItemAsync' | 'isAvailableAsync' | 'setItemAsync'
    >
  | null
  | undefined;

export type AuthProvider = 'email' | 'google' | 'kakao' | 'apple';

export type AuthUser = {
  id: string;
  email: string;
  authProvider: AuthProvider;
  emailVerified: boolean;
};

export type AuthResult = {
  user: AuthUser;
  needsVerification: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function getSecureStore() {
  if (secureStoreModule !== undefined) {
    return secureStoreModule;
  }

  try {
    const secureStore = await import('expo-secure-store');
    secureStoreModule = (await secureStore.isAvailableAsync())
      ? secureStore
      : null;
  } catch {
    secureStoreModule = null;
  }

  return secureStoreModule;
}

export async function getToken(): Promise<string | null> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    return secureStore.getItemAsync(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_FALLBACK_KEY);
}

async function setToken(token: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_FALLBACK_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_FALLBACK_KEY, token);
}

async function clearToken(): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(TOKEN_KEY);
  }
  await AsyncStorage.removeItem(TOKEN_FALLBACK_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { auth = false }: { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('서버 응답이 지연되고 있습니다.', 0);
    }
    throw new ApiError('서버에 연결할 수 없습니다.', 0);
  }
  clearTimeout(timeout);

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(
      typeof body.error === 'string' ? body.error : '요청에 실패했습니다.',
      res.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }

  return body as T;
}

type AuthResponse = { token: string; user: AuthUser };

async function persistAuth(data: AuthResponse): Promise<AuthUser> {
  await setToken(data.token);
  return data.user;
}

export const authApi = {
  async register(email: string, password: string): Promise<AuthResult> {
    const data = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = await persistAuth(data);
    return { user, needsVerification: !user.emailVerified };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const data = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const user = await persistAuth(data);
      return { user, needsVerification: !user.emailVerified };
    } catch (error) {
      // Unverified email: server returns 403 with a token to drive the
      // verification flow. The ApiError loses the body, so re-fetch raw.
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
        const res = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const body = (await res.json()) as AuthResponse;
        const user = await persistAuth(body);
        return { user, needsVerification: true };
      }
      throw error;
    }
  },

  async socialLogin(
    provider: Exclude<AuthProvider, 'email'>,
    token: string,
    extra: { email?: string; redirectUri?: string } = {},
  ): Promise<AuthResult> {
    const data = await request<AuthResponse>('/auth/social', {
      method: 'POST',
      body: JSON.stringify({ provider, token, ...extra }),
    });
    const user = await persistAuth(data);
    return { user, needsVerification: false };
  },

  async loginWithToken(token: string): Promise<AuthUser> {
    await setToken(token);
    return this.me();
  },

  async verifyEmail(code: string): Promise<void> {
    await request<{ success: boolean }>(
      '/auth/verify-email',
      { method: 'POST', body: JSON.stringify({ code }) },
      { auth: true },
    );
  },

  async resendVerification(): Promise<void> {
    await request<{ success: boolean }>(
      '/auth/resend-verification',
      { method: 'POST' },
      { auth: true },
    );
  },

  async me(): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>(
      '/auth/me',
      {},
      { auth: true },
    );
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' }, { auth: true });
    } catch {
      // Revoke best-effort; always clear the local token below.
    }
    await clearToken();
  },

  async deleteAccount(): Promise<void> {
    await request<{ success: boolean }>(
      '/auth/account',
      { method: 'DELETE' },
      { auth: true },
    );
    await clearToken();
  },

  async restoreSession(): Promise<AuthUser | null> {
    const token = await getToken();
    if (!token) return null;
    try {
      return await this.me();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
      }
      return null;
    }
  },
};
