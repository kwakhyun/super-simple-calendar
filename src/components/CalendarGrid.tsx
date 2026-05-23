import { Animated, Pressable, Text, View, type PanResponderInstance } from 'react-native';

import { WEEK_DAYS } from '../i18n/translations';
import type { AppStyles } from '../styles/createStyles';
import type { CalendarDay, Language, Translation } from '../types';

type CalendarGridProps = {
  calendarDays: CalendarDay[];
  language: Language;
  monthTranslateX: Animated.Value;
  onOpenMemo: (dateKey: string) => void;
  panHandlers: PanResponderInstance['panHandlers'];
  styles: AppStyles;
  text: Translation;
};

export function CalendarGrid({
  calendarDays,
  language,
  monthTranslateX,
  onOpenMemo,
  panHandlers,
  styles,
  text,
}: CalendarGridProps) {
  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.calendarCard,
        {
          transform: [{ translateX: monthTranslateX }],
        },
      ]}
    >
      <View style={styles.weekRow}>
        {WEEK_DAYS[language].map((weekDay) => (
          <Text key={weekDay} style={styles.weekDay}>
            {weekDay}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((calendarDay) => (
          <Pressable
            accessibilityLabel={`${calendarDay.key} ${text.memoListTitle}`}
            accessibilityRole="button"
            key={calendarDay.key}
            onPress={() => onOpenMemo(calendarDay.key)}
            style={({ pressed }) => [
              styles.dayCell,
              !calendarDay.isCurrentMonth && styles.outsideMonthDay,
              calendarDay.isToday && styles.todayCell,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.dayHeader}>
              <Text
                style={[
                  styles.dayNumber,
                  !calendarDay.isCurrentMonth && styles.outsideMonthText,
                  calendarDay.isToday && styles.todayText,
                ]}
              >
                {calendarDay.day}
              </Text>
              {calendarDay.memos.length > 0 ? (
                <Text style={styles.memoCount}>{calendarDay.memos.length}</Text>
              ) : null}
            </View>
            <View style={styles.memoPreviewList}>
              {calendarDay.memos.slice(0, 3).map((memo) => (
                <View key={memo.id} style={styles.memoPreview}>
                  <Text numberOfLines={2} style={styles.memoPreviewText}>
                    {memo.text}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
