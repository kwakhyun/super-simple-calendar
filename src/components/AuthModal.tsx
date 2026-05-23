import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AppStyles } from '../styles/createStyles';
import type { AuthMode, Translation } from '../types';
import type { AuthUser } from '../utils/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AuthModalProps = {
  authUser: AuthUser | null;
  iconColor: string;
  needsVerification: boolean;
  placeholderColor: string;
  onClose: () => void;
  onResendVerification: () => Promise<string | null>;
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignOut: () => void;
  onSignUp: (email: string, password: string) => Promise<string | null>;
  // Social login is intentionally disabled for the initial release.
  // onSocialLogin: (
  //   provider: 'google' | 'apple' | 'kakao',
  // ) => Promise<string | null>;
  onVerifyEmail: (code: string) => Promise<string | null>;
  styles: AppStyles;
  text: Translation;
  visible: boolean;
};

export function AuthModal({
  authUser,
  iconColor,
  needsVerification,
  placeholderColor,
  onClose,
  onResendVerification,
  onSignIn,
  onSignOut,
  onSignUp,
  // onSocialLogin,
  onVerifyEmail,
  styles,
  text,
  visible,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const title = authUser
    ? needsVerification
      ? text.verifyEmailTitle
      : text.account
    : authMode === 'signIn'
      ? text.signIn
      : text.signUp;

  useEffect(() => {
    setAuthError(null);
    setInfoMessage(null);
    setCode('');
    if (authUser) {
      setEmail('');
      setPassword('');
    }
  }, [authUser, needsVerification, visible]);

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
    setPassword('');
  };

  const handleSubmitAuth = async () => {
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError(text.authFillAllFields);
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setAuthError(text.authInvalidEmail);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setAuthError(text.authPasswordTooShort);
      return;
    }

    setSubmitting(true);
    setAuthError(null);
    const result =
      authMode === 'signUp'
        ? await onSignUp(trimmedEmail, password)
        : await onSignIn(trimmedEmail, password);
    setSubmitting(false);

    if (result) {
      setAuthError(result);
      return;
    }

    if (authMode === 'signIn') {
      onClose();
    }
  };

  const handleVerify = async () => {
    if (submitting) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setAuthError(text.authInvalidEmail);
      return;
    }
    setSubmitting(true);
    setAuthError(null);
    const result = await onVerifyEmail(code.trim());
    setSubmitting(false);
    if (result) {
      setAuthError(result);
      return;
    }
    onClose();
  };

  const handleResend = async () => {
    if (submitting) return;
    setSubmitting(true);
    setAuthError(null);
    setInfoMessage(null);
    const result = await onResendVerification();
    setSubmitting(false);
    if (result) {
      setAuthError(result);
    } else {
      setInfoMessage(text.codeResent);
    }
  };

  // Social login is intentionally disabled for the initial release.
  // const handleSocial = async (provider: 'google' | 'apple' | 'kakao') => {
  //   if (submitting) return;
  //   setSubmitting(true);
  //   setAuthError(null);
  //   const result = await onSocialLogin(provider);
  //   setSubmitting(false);
  //   if (result) {
  //     setAuthError(result);
  //     return;
  //   }
  //   onClose();
  // };

  const handleSignOut = () => {
    onSignOut();
    setEmail('');
    setPassword('');
    setCode('');
    setAuthError(null);
    setInfoMessage(null);
    setAuthMode('signIn');
    onClose();
  };

  const renderContent = () => {
    if (authUser && needsVerification) {
      return (
        <View style={styles.authCard}>
          <Text style={styles.settingLabel}>{text.verifyEmailTitle}</Text>
          <Text style={styles.accountHelpText}>
            {text.verifyEmailHelp(authUser.email)}
          </Text>
          <TextInput
            accessibilityLabel={text.verificationCodePlaceholder}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder={text.verificationCodePlaceholder}
            placeholderTextColor={placeholderColor}
            style={styles.accountInput}
            value={code}
          />
          {authError ? (
            <Text style={styles.accountError}>{authError}</Text>
          ) : null}
          {infoMessage ? (
            <Text style={styles.accountInfoText}>{infoMessage}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handleVerify()}
            style={({ pressed }) => [
              styles.accountPrimaryButton,
              (pressed || submitting) && styles.pressed,
            ]}
          >
            <Text style={styles.accountPrimaryButtonText}>
              {text.verifyButton}
            </Text>
          </Pressable>
          <View style={styles.accountDivider}>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void handleResend()}
            >
              <Text style={styles.accountDividerText}>{text.resendCode}</Text>
            </Pressable>
            <View style={styles.accountDividerLine} />
            <Pressable accessibilityRole="button" onPress={handleSignOut}>
              <Text style={styles.accountDividerText}>{text.signOut}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (authUser) {
      return (
        <View style={styles.authCard}>
          <Text style={styles.settingLabel}>{text.account}</Text>
          <Text style={styles.accountHelpText} numberOfLines={2}>
            {text.signedInAs(authUser.email)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.accountPrimaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.accountPrimaryButtonText}>{text.signOut}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.authCard}>
        <Text style={styles.accountHelpText}>{text.accountHelp}</Text>

        <View style={styles.segmentedControl}>
          {(['signIn', 'signUp'] as const).map((mode) => (
            <Pressable
              accessibilityRole="button"
              key={mode}
              onPress={() => switchAuthMode(mode)}
              style={({ pressed }) => [
                styles.segmentButton,
                authMode === mode && styles.segmentButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  authMode === mode && styles.segmentButtonTextActive,
                ]}
              >
                {mode === 'signIn' ? text.signIn : text.signUp}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.accountForm}>
          <Text style={styles.accountFieldLabel}>{text.email}</Text>
          <TextInput
            accessibilityLabel={text.email}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={text.emailPlaceholder}
            placeholderTextColor={placeholderColor}
            style={styles.accountInput}
            value={email}
          />

          <Text style={styles.accountFieldLabel}>{text.password}</Text>
          <TextInput
            accessibilityLabel={text.password}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPassword}
            placeholder={text.passwordPlaceholder}
            placeholderTextColor={placeholderColor}
            secureTextEntry
            style={styles.accountInput}
            value={password}
          />

          {authError ? (
            <Text style={styles.accountError}>{authError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handleSubmitAuth()}
            style={({ pressed }) => [
              styles.accountPrimaryButton,
              (pressed || submitting) && styles.pressed,
            ]}
          >
            <Text style={styles.accountPrimaryButtonText}>
              {authMode === 'signIn' ? text.signIn : text.signUp}
            </Text>
          </Pressable>
        </View>

        {/*
        Social login is intentionally disabled for the initial release.

        <View style={styles.accountDivider}>
          <View style={styles.accountDividerLine} />
          <Text style={styles.accountDividerText}>{text.continueWith}</Text>
          <View style={styles.accountDividerLine} />
        </View>

        <View style={styles.socialButtonStack}>...</View>
        */}
      </View>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.settingsScreen}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>{title}</Text>
          <Pressable
            accessibilityLabel={text.close}
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.settingsCloseButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="close" size={24} color={iconColor} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.authScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
