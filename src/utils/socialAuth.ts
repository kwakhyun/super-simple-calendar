/*
 * Social login is intentionally disabled for the initial release.
 *
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_API_URL = 'https://super-simple-calendar-api.fly.dev';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
const APP_SCHEME = 'supersimplecalendar';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_PLACEHOLDER_CLIENT_ID = 'google-auth-disabled.local';

const getGoogleClientIdForPlatform = () =>
  Platform.select({
    ios: GOOGLE_IOS_CLIENT_ID,
    android: GOOGLE_ANDROID_CLIENT_ID,
    default: GOOGLE_WEB_CLIENT_ID,
  });

export type SocialResult =
  // Kakao: the server completes OAuth and returns our own JWT.
  | { kind: 'token'; jwt: string }
  // Google/Apple: a provider token the server still needs to verify.
  | { kind: 'social'; provider: 'google' | 'apple'; token: string; email?: string };

export function useSocialAuth() {
  const googleClientId = getGoogleClientIdForPlatform();
  const [googleRequest, , googlePrompt] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID ?? GOOGLE_PLACEHOLDER_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID ?? GOOGLE_PLACEHOLDER_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID ?? GOOGLE_PLACEHOLDER_CLIENT_ID,
  });
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    AppleAuthentication.isAvailableAsync()
      .then(setAppleReady)
      .catch(() => setAppleReady(false));
  }, []);

  const signInWithGoogle =
    useCallback(async (): Promise<SocialResult | null> => {
      if (!googleClientId) {
        throw new Error('Google 로그인 설정이 필요합니다.');
      }
      const result = await googlePrompt();
      if (result?.type !== 'success') {
        return null;
      }
      const accessToken = result.authentication?.accessToken;
      if (!accessToken) {
        throw new Error('Google 토큰을 가져오지 못했습니다.');
      }
      return { kind: 'social', provider: 'google', token: accessToken };
    }, [googleClientId, googlePrompt]);

  const signInWithApple =
    useCallback(async (): Promise<SocialResult | null> => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          ],
        });
        if (!credential.identityToken) {
          throw new Error('Apple 토큰을 가져오지 못했습니다.');
        }
        return {
          kind: 'social',
          provider: 'apple',
          token: credential.identityToken,
          email: credential.email ?? undefined,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
        ) {
          return null;
        }
        throw error;
      }
    }, []);

  const signInWithKakao =
    useCallback(async (): Promise<SocialResult | null> => {
      const returnUrl = `${APP_SCHEME}://auth`;
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_BASE}/auth/kakao/start`,
        returnUrl,
      );
      if (result.type !== 'success' || !result.url) {
        return null;
      }
      const { queryParams } = Linking.parse(result.url);
      const error = queryParams?.error;
      if (typeof error === 'string') {
        throw new Error(error);
      }
      const jwt = queryParams?.token;
      if (typeof jwt !== 'string' || !jwt) {
        throw new Error('카카오 로그인에 실패했습니다.');
      }
      return { kind: 'token', jwt };
    }, []);

  return {
    googleReady: Boolean(googleClientId && googleRequest),
    appleReady,
    signInWithGoogle,
    signInWithApple,
    signInWithKakao,
  };
}
*/
