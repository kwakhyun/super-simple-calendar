import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from './src/components/AppHeader';
import { AuthModal } from './src/components/AuthModal';
import { CalendarGrid } from './src/components/CalendarGrid';
import { MemoModal } from './src/components/MemoModal';
import { SettingsModal } from './src/components/SettingsModal';
import { TRANSLATIONS } from './src/i18n/translations';
import {
  loadStoredData,
  saveStoredMemos,
  saveStoredSettings,
} from './src/storage/appStorage';
import { createStyles } from './src/styles/createStyles';
import { DEFAULT_SETTINGS, THEMES } from './src/theme';
import type { AppSettings, Memo, MemosByDate } from './src/types';
import { ApiError, authApi, type AuthUser } from './src/utils/api';
import { getCalendarDays, SWIPE_THRESHOLD } from './src/utils/calendar';
import { getCurrentMonth, getSelectedDateTitle } from './src/utils/date';
import { createMemo } from './src/utils/memos';
import { useSocialAuth, type SocialResult } from './src/utils/socialAuth';

export default function App() {
  const { width } = useWindowDimensions();
  const monthTranslateX = useRef(new Animated.Value(0)).current;
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonth);
  const [memos, setMemos] = useState<MemosByDate>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [draftMemo, setDraftMemo] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const social = useSocialAuth();

  const text = TRANSLATIONS[settings.language];
  const colors = THEMES[settings.theme];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth, memos),
    [visibleMonth, memos],
  );
  const selectedDateMemos = selectedDateKey ? memos[selectedDateKey] ?? [] : [];
  const hasSelectedDateMemos = selectedDateMemos.length > 0;
  const selectedDateTitle = selectedDateKey
    ? getSelectedDateTitle(selectedDateKey, settings.language)
    : '';

  const animateMonth = (offset: number) => {
    Animated.timing(monthTranslateX, {
      duration: 170,
      toValue: offset < 0 ? width : -width,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setVisibleMonth((currentMonth) => {
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(currentMonth.getMonth() + offset);
        return nextMonth;
      });

      monthTranslateX.setValue(offset < 0 ? -width : width);
      Animated.spring(monthTranslateX, {
        damping: 18,
        mass: 0.9,
        stiffness: 140,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });
  };

  const resetMonthPosition = () => {
    Animated.spring(monthTranslateX, {
      damping: 16,
      stiffness: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const calendarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          monthTranslateX.setValue(gestureState.dx * 0.45);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD) {
            animateMonth(-1);
            return;
          }

          if (gestureState.dx < -SWIPE_THRESHOLD) {
            animateMonth(1);
            return;
          }

          resetMonthPosition();
        },
        onPanResponderTerminate: resetMonthPosition,
      }),
    [monthTranslateX, width],
  );

  useEffect(() => {
    const hydrateApp = async () => {
      try {
        const storedData = await loadStoredData();

        if (storedData.memos) {
          setMemos(storedData.memos);
        }

        if (storedData.settings) {
          setSettings(storedData.settings);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(text.loadMemoError(message));
      }

      try {
        const restored = await authApi.restoreSession();
        if (restored) {
          setAuthUser(restored);
          setNeedsVerification(!restored.emailVerified);
        }
      } catch {
        // Offline or server unreachable — stay logged out until next try.
      }
    };

    void hydrateApp();
  }, []);

  const persistMemos = async (nextMemos: MemosByDate) => {
    try {
      await saveStoredMemos(nextMemos);
      setMemos(nextMemos);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(text.saveMemoError(message));
    }
  };

  const updateSettings = async (nextSettings: AppSettings) => {
    try {
      await saveStoredSettings(nextSettings);
      setSettings(nextSettings);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(text.saveSettingsError(message));
    }
  };

  const toErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      return error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  };

  const signUp = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    try {
      const result = await authApi.register(email, password);
      setAuthUser(result.user);
      setNeedsVerification(result.needsVerification);
      return null;
    } catch (error) {
      return toErrorMessage(error);
    }
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    try {
      const result = await authApi.login(email, password);
      setAuthUser(result.user);
      setNeedsVerification(result.needsVerification);
      return null;
    } catch (error) {
      return toErrorMessage(error);
    }
  };

  const verifyEmail = async (code: string): Promise<string | null> => {
    try {
      await authApi.verifyEmail(code);
      const refreshed = await authApi.me();
      setAuthUser(refreshed);
      setNeedsVerification(false);
      return null;
    } catch (error) {
      return toErrorMessage(error);
    }
  };

  const resendVerification = async (): Promise<string | null> => {
    try {
      await authApi.resendVerification();
      return null;
    } catch (error) {
      return toErrorMessage(error);
    }
  };

  const socialLogin = async (
    provider: 'google' | 'apple' | 'kakao',
  ): Promise<string | null> => {
    try {
      let result: SocialResult | null = null;

      if (provider === 'google') {
        result = await social.signInWithGoogle();
      } else if (provider === 'apple') {
        result = await social.signInWithApple();
      } else {
        result = await social.signInWithKakao();
      }

      if (!result) {
        return null; // user cancelled
      }

      if (result.kind === 'token') {
        const user = await authApi.loginWithToken(result.jwt);
        setAuthUser(user);
        setNeedsVerification(!user.emailVerified);
        return null;
      }

      const auth = await authApi.socialLogin(result.provider, result.token, {
        email: result.email,
      });
      setAuthUser(auth.user);
      setNeedsVerification(auth.needsVerification);
      return null;
    } catch (error) {
      return toErrorMessage(error);
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } finally {
      setAuthUser(null);
      setNeedsVerification(false);
    }
  };

  const deleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      setAuthUser(null);
      setNeedsVerification(false);
      setIsSettingsOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  };

  const openMemo = (dateKey: string) => {
    const existingMemos = memos[dateKey] ?? [];

    setSelectedDateKey(dateKey);
    setEditingMemoId(existingMemos.length === 0 ? 'new' : null);
    setDraftMemo('');
    setErrorMessage(null);
  };

  const closeMemo = () => {
    setSelectedDateKey(null);
    setEditingMemoId(null);
    setDraftMemo('');
  };

  const startNewMemo = () => {
    setEditingMemoId('new');
    setDraftMemo('');
  };

  const startEditMemo = (memo: Memo) => {
    setEditingMemoId(memo.id);
    setDraftMemo(memo.text);
  };

  const saveMemo = async () => {
    if (!selectedDateKey) {
      setErrorMessage(text.saveMemoError('No date is selected.'));
      return;
    }

    const trimmedMemo = draftMemo.trim();

    if (!trimmedMemo) {
      setDraftMemo('');
      return;
    }

    const currentDateMemos = memos[selectedDateKey] ?? [];
    const now = new Date().toISOString();
    const nextDateMemos =
      editingMemoId && editingMemoId !== 'new'
        ? currentDateMemos.map((memo) =>
            memo.id === editingMemoId
              ? { ...memo, text: trimmedMemo, updatedAt: now }
              : memo,
          )
        : [...currentDateMemos, createMemo(trimmedMemo)];

    await persistMemos({
      ...memos,
      [selectedDateKey]: nextDateMemos,
    });

    setEditingMemoId(null);
    setDraftMemo('');
  };

  const deleteMemo = async (memoId: string) => {
    if (!selectedDateKey) {
      setErrorMessage(text.saveMemoError('No date is selected.'));
      return;
    }

    const nextDateMemos = (memos[selectedDateKey] ?? []).filter(
      (memo) => memo.id !== memoId,
    );
    const nextMemos = { ...memos };

    if (nextDateMemos.length > 0) {
      nextMemos[selectedDateKey] = nextDateMemos;
    } else {
      delete nextMemos[selectedDateKey];
    }

    await persistMemos(nextMemos);

    if (editingMemoId === memoId) {
      setEditingMemoId(null);
      setDraftMemo('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppHeader
          iconColor={colors.text}
          language={settings.language}
          onOpenSettings={() => setIsSettingsOpen(true)}
          styles={styles}
          text={text}
          visibleMonth={visibleMonth}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <CalendarGrid
          calendarDays={calendarDays}
          language={settings.language}
          monthTranslateX={monthTranslateX}
          onOpenMemo={openMemo}
          panHandlers={calendarPanResponder.panHandlers}
          styles={styles}
          text={text}
        />
      </ScrollView>

      <MemoModal
        draftMemo={draftMemo}
        editingMemoId={editingMemoId}
        hasMemos={hasSelectedDateMemos}
        memos={selectedDateMemos}
        onChangeDraftMemo={setDraftMemo}
        onClose={closeMemo}
        onDeleteMemo={(memoId) => void deleteMemo(memoId)}
        onSaveMemo={() => void saveMemo()}
        onStartEditMemo={startEditMemo}
        onStartNewMemo={startNewMemo}
        selectedDateTitle={selectedDateTitle}
        styles={styles}
        text={text}
        visible={selectedDateKey !== null}
      />

      <SettingsModal
        authUser={authUser}
        iconColor={colors.text}
        needsVerification={needsVerification}
        onClose={() => setIsSettingsOpen(false)}
        onDeleteAccount={() => void deleteAccount()}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={() => void signOut()}
        onUpdateSettings={(nextSettings) => void updateSettings(nextSettings)}
        settings={settings}
        styles={styles}
        text={text}
        visible={isSettingsOpen}
      />

      <AuthModal
        appleReady={social.appleReady}
        authUser={authUser}
        googleReady={social.googleReady}
        iconColor={colors.text}
        needsVerification={needsVerification}
        onClose={() => setIsAuthOpen(false)}
        onResendVerification={resendVerification}
        onSignIn={signIn}
        onSignOut={() => void signOut()}
        onSignUp={signUp}
        onSocialLogin={socialLogin}
        onVerifyEmail={verifyEmail}
        placeholderColor={colors.subtleText}
        styles={styles}
        text={text}
        visible={isAuthOpen}
      />
    </SafeAreaView>
  );
}
