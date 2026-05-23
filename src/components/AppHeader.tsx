import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { AppStyles } from '../styles/createStyles';
import type { Language, Translation } from '../types';
import { getMonthTitle } from '../utils/date';

type AppHeaderProps = {
  iconColor: string;
  language: Language;
  onOpenSettings: () => void;
  styles: AppStyles;
  text: Translation;
  visibleMonth: Date;
};

export function AppHeader({
  iconColor,
  language,
  onOpenSettings,
  styles,
  text,
  visibleMonth,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{getMonthTitle(visibleMonth, language)}</Text>
      <Pressable
        accessibilityLabel={text.settings}
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={({ pressed }) => [
          styles.headerSettingsButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="settings-sharp" size={24} color={iconColor} />
      </Pressable>
    </View>
  );
}
