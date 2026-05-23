import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type { AppStyles } from '../styles/createStyles';
import type { AppSettings, Language, ThemeMode, Translation } from '../types';
import type { AuthUser } from '../utils/api';

type SettingsModalProps = {
  authUser: AuthUser | null;
  iconColor: string;
  needsVerification: boolean;
  onClose: () => void;
  onDeleteAccount: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onUpdateSettings: (settings: AppSettings) => void;
  settings: AppSettings;
  styles: AppStyles;
  text: Translation;
  visible: boolean;
};

export function SettingsModal({
  authUser,
  iconColor,
  needsVerification,
  onClose,
  onDeleteAccount,
  onOpenAuth,
  onSignOut,
  onUpdateSettings,
  settings,
  styles,
  text,
  visible,
}: SettingsModalProps) {
  const updateLanguage = (language: Language) => {
    onUpdateSettings({ ...settings, language });
  };

  const updateTheme = (theme: ThemeMode) => {
    onUpdateSettings({ ...settings, theme });
  };

  const openAuth = () => {
    onClose();
    onOpenAuth();
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      text.deleteAccountConfirmTitle,
      text.deleteAccountConfirmMessage,
      [
        { text: text.cancel, style: 'cancel' },
        {
          text: text.deleteAccount,
          onPress: onDeleteAccount,
          style: 'destructive',
        },
      ],
    );
  };

  const renderAccount = () => {
    if (authUser) {
      return (
        <View>
          <Text style={styles.accountHelpText} numberOfLines={2}>
            {needsVerification
              ? text.verifyEmailHelp(authUser.email)
              : text.signedInAs(authUser.email)}
          </Text>
          <View style={styles.settingActionRow}>
            {needsVerification ? (
              <Pressable
                accessibilityRole="button"
                onPress={openAuth}
                style={({ pressed }) => [
                  styles.settingPrimaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.settingPrimaryActionText}>
                  {text.verifyButton}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={({ pressed }) => [
                needsVerification
                  ? styles.settingSecondaryAction
                  : styles.settingPrimaryAction,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={
                  needsVerification
                    ? styles.settingSecondaryActionText
                    : styles.settingPrimaryActionText
                }
              >
                {text.signOut}
              </Text>
            </Pressable>
          </View>
          <View style={styles.dangerZone}>
            <Text style={styles.accountHelpText}>{text.deleteAccountHelp}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDeleteAccount}
              style={({ pressed }) => [
                styles.settingDangerAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.settingDangerActionText}>
                {text.deleteAccount}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.accountHelpText}>{text.accountHelp}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={openAuth}
          style={({ pressed }) => [
            styles.settingPrimaryAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.settingPrimaryActionText}>
            {text.openAuthPage}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.settingsScreen}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>{text.settings}</Text>
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
          contentContainerStyle={styles.settingsScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{text.account}</Text>
            {renderAccount()}
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{text.language}</Text>
            <View style={styles.segmentedControl}>
              {(['en', 'ko'] as const).map((language) => (
                <Pressable
                  accessibilityRole="button"
                  key={language}
                  onPress={() => updateLanguage(language)}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    settings.language === language && styles.segmentButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      settings.language === language &&
                        styles.segmentButtonTextActive,
                    ]}
                  >
                    {language === 'en' ? 'English' : '한국어'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{text.theme}</Text>
            <View style={styles.segmentedControl}>
              {(['light', 'dark'] as const).map((theme) => (
                <Pressable
                  accessibilityRole="button"
                  key={theme}
                  onPress={() => updateTheme(theme)}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    settings.theme === theme && styles.segmentButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      settings.theme === theme &&
                        styles.segmentButtonTextActive,
                    ]}
                  >
                    {theme === 'light' ? text.light : text.dark}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
